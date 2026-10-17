-- Execute uma vez no SQL Editor do projeto Supabase, como postgres.
-- Nenhum dado existente é apagado pela migração. Objetos homônimos causam erro.
begin;

create schema if not exists brightline_private;
revoke all on schema brightline_private from public, anon;
grant usage on schema brightline_private to authenticated;

create table public.reports (
  owner_id uuid not null references auth.users(id) on delete cascade,
  report_id text not null,
  modality text not null,
  radiologist text not null,
  ordering_physician text not null,
  text text not null check (length(text) > 0),
  flagged_by_radiologist boolean not null,
  ground_truth jsonb not null default '[]' check (jsonb_typeof(ground_truth) = 'array'),
  primary key (owner_id, report_id)
);

create table public.extractions (
  owner_id uuid not null,
  report_id text not null,
  findings jsonb not null check (jsonb_typeof(findings) = 'array'),
  primary key (owner_id, report_id),
  foreign key (owner_id, report_id) references public.reports(owner_id, report_id) on delete cascade
);

create table public.sim_state (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  sim_now double precision not null default 0 check (sim_now >= 0 and sim_now < 'Infinity'::float8)
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  report_id text not null,
  finding text not null,
  evidence text not null check (length(evidence) > 0),
  urgency text not null check (urgency in ('critical', 'urgent', 'actionable')),
  deadline_hours integer not null,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  status text not null default 'notified' check (status in ('detected', 'notified', 'read', 'action_taken', 'closed', 'escalated')),
  escalation_level integer not null default 0 check (escalation_level between 0 and 2),
  current_target text not null,
  notified_at_sim double precision not null default 0,
  deadline_at_sim double precision not null,
  acknowledged_at_sim double precision,
  unique(owner_id, id),
  foreign key(owner_id, report_id) references public.reports(owner_id, report_id) on delete cascade,
  check (deadline_hours = case urgency when 'critical' then 1 when 'urgent' then 24 else 720 end)
);

create table public.events (
  id bigint generated always as identity primary key,
  owner_id uuid not null,
  case_id uuid not null,
  type text not null,
  detail text not null,
  at_sim double precision not null,
  actor_id uuid not null references auth.users(id) on delete cascade,
  foreign key(owner_id, case_id) references public.cases(owner_id, id) on delete cascade
);
create index cases_owner_order on public.cases(owner_id, urgency, deadline_at_sim);
create index events_case_order on public.events(owner_id, case_id, at_sim, id);

alter table public.reports enable row level security;
alter table public.extractions enable row level security;
alter table public.cases enable row level security;
alter table public.events enable row level security;
alter table public.sim_state enable row level security;

revoke all on public.reports, public.extractions, public.cases, public.events, public.sim_state from public, anon, authenticated;
grant select on public.reports, public.extractions, public.cases, public.events, public.sim_state to authenticated;
create policy own_reports on public.reports for select to authenticated using ((select auth.uid()) = owner_id);
create policy own_extractions on public.extractions for select to authenticated using ((select auth.uid()) = owner_id);
create policy own_cases on public.cases for select to authenticated using ((select auth.uid()) = owner_id);
create policy own_events on public.events for select to authenticated using ((select auth.uid()) = owner_id);
create policy own_clock on public.sim_state for select to authenticated using ((select auth.uid()) = owner_id);

-- Helpers privados, não expor brightline_private na Data API.
create function brightline_private.build_cases(who uuid) returns integer
language plpgsql set search_path = '' as $$
declare r record; f jsonb; cid uuid; count_cases integer := 0;
begin
  delete from public.cases where owner_id = who;
  for r in select p.*, e.findings from public.reports p join public.extractions e
    on p.owner_id=e.owner_id and p.report_id=e.report_id where p.owner_id=who
  loop
    for f in select value from jsonb_array_elements(r.findings)
    loop
      insert into public.cases(owner_id,report_id,finding,evidence,urgency,deadline_hours,confidence,current_target,deadline_at_sim)
      values(who,r.report_id,f->>'finding',f->>'evidence',f->>'urgency',(f->>'deadline_hours')::integer,
        f->>'confidence',r.ordering_physician,(f->>'deadline_hours')::integer) returning id into cid;
      insert into public.events(owner_id,case_id,type,detail,at_sim,actor_id) values
        (who,cid,'detected','Achado detectado; IA sugere, humano valida',0,who),
        (who,cid,'notified','Notificação simulada enviada a '||r.ordering_physician,0,who);
      count_cases := count_cases + 1;
    end loop;
  end loop;
  return count_cases;
end $$;

create function brightline_private.command(operation text, payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  who uuid := auth.uid();
  now_sim double precision;
  hours double precision;
  r jsonb;
  e jsonb;
  f jsonb;
  c public.cases%rowtype;
  dest text;
  n integer;
  changed jsonb := '[]';
  names text[];
begin
  if who is null then raise exception using errcode='42501', message='Autenticação obrigatória'; end if;
  -- Serializa importação, reset, ações e relógio da mesma conta.
  perform pg_advisory_xact_lock(hashtextextended(who::text, 0));
  insert into public.sim_state(owner_id) values(who) on conflict do nothing;
  select sim_now into now_sim from public.sim_state where owner_id=who for update;

  if operation = 'import' then
    if jsonb_typeof(payload->'reports') is distinct from 'array'
       or jsonb_typeof(payload->'extractions') is distinct from 'object' then
      raise exception using errcode='PT400', message='Formato de importação inválido';
    end if;
    if jsonb_array_length(payload->'reports') not between 1 and 500
       or (select count(*) from jsonb_object_keys(payload->'extractions')) <> jsonb_array_length(payload->'reports') then
      raise exception using errcode='PT400', message='Conjunto incompleto';
    end if;
    -- Validado também no banco: a RPC pode ser chamada diretamente.
    names := '{}';
    for r in select value from jsonb_array_elements(payload->'reports') loop
      if jsonb_typeof(r) is distinct from 'object' or coalesce(length(btrim(r->>'report_id')),0)=0
        or r->>'report_id' = any(names) or coalesce(length(r->>'text'),0)=0
        or jsonb_typeof(r->'flagged_by_radiologist') is distinct from 'boolean'
        or jsonb_typeof(r->'ground_truth') is distinct from 'array'
        or coalesce(length(r->>'modality'),0)=0 or coalesce(length(r->>'radiologist'),0)=0
        or coalesce(length(r->>'ordering_physician'),0)=0 then
        raise exception using errcode='PT400', message='Laudo inválido';
      end if;
      names := array_append(names, r->>'report_id');
      e := payload->'extractions'->(r->>'report_id');
      if jsonb_typeof(e) is distinct from 'object' or e->>'report_id' is distinct from r->>'report_id'
        or jsonb_typeof(e->'findings') is distinct from 'array' then
        raise exception using errcode='PT400', message='Extração inválida';
      end if;
      for f in select value from jsonb_array_elements(e->'findings') loop
        if jsonb_typeof(f) is distinct from 'object' or coalesce(length(btrim(f->>'finding')),0)=0
          or coalesce(length(btrim(f->>'evidence')),0)=0
          or strpos(r->>'text',f->>'evidence')=0
          or coalesce(f->>'urgency','') not in ('critical','urgent','actionable')
          or coalesce(f->>'confidence','') not in ('high','medium','low')
          or jsonb_typeof(f->'deadline_hours') is distinct from 'number'
          or (f->>'deadline_hours')::numeric <> (case f->>'urgency' when 'critical' then 1 when 'urgent' then 24 else 720 end) then
          raise exception using errcode='PT400', message='Achado ou evidência inválido';
        end if;
      end loop;
    end loop;
    delete from public.reports where owner_id=who;
    for r in select value from jsonb_array_elements(payload->'reports') loop
      insert into public.reports values(who,r->>'report_id',r->>'modality',r->>'radiologist',r->>'ordering_physician',
        r->>'text',(r->>'flagged_by_radiologist')::boolean,r->'ground_truth');
      insert into public.extractions values(who,r->>'report_id',payload->'extractions'->(r->>'report_id')->'findings');
    end loop;
    update public.sim_state set sim_now=0 where owner_id=who;
    n := brightline_private.build_cases(who);
    return jsonb_build_object('reports',jsonb_array_length(payload->'reports'),'cases',n,'sim_now',0);

  elsif operation = 'reset' then
    update public.sim_state set sim_now=0 where owner_id=who;
    n := brightline_private.build_cases(who);
    return jsonb_build_object('cases',n,'sim_now',0);

  elsif operation = 'advance' then
    hours := (payload->>'hours')::double precision;
    if hours is null or not (hours>0 and hours<=8760) then
      raise exception using errcode='PT400', message='Avanço inválido';
    end if;
    now_sim := now_sim + hours;
    update public.sim_state set sim_now=now_sim where owner_id=who;
    for c in select * from public.cases where owner_id=who and status in ('notified','escalated')
      and deadline_at_sim<=now_sim for update
    loop
      if c.escalation_level<2 then
        select case when c.escalation_level=0 then radiologist else 'Coordenação de Radiologia' end
          into dest from public.reports where owner_id=who and report_id=c.report_id;
        update public.cases set escalation_level=escalation_level+1,status='escalated',
          current_target=dest,deadline_at_sim=now_sim+deadline_hours where id=c.id and owner_id=who;
        insert into public.events(owner_id,case_id,type,detail,at_sim,actor_id)
          values(who,c.id,'escalated','Escalado para '||dest,now_sim,who);
        changed := changed || jsonb_build_array(jsonb_build_object('id',c.id,'status','escalated',
          'escalation_level',c.escalation_level+1,'current_target',dest));
      elsif not exists(select 1 from public.events where owner_id=who and case_id=c.id and type='coordination_overdue') then
        insert into public.events(owner_id,case_id,type,detail,at_sim,actor_id)
          values(who,c.id,'coordination_overdue','Prazo estourado na coordenação',now_sim,who);
      end if;
    end loop;
    return jsonb_build_object('sim_now',now_sim,'changed_cases',changed);

  elsif operation in ('acknowledge','action') then
    select * into c from public.cases where owner_id=who and id=(payload->>'id')::uuid for update;
    if not found then raise exception using errcode='PT404', message='Caso não encontrado'; end if;
    if operation='acknowledge' then
      if c.status not in ('notified','escalated') or coalesce(length(btrim(payload->>'by')),0)=0 then
        raise exception using errcode='PT400', message='Confirmação inválida';
      end if;
      update public.cases set status='read',acknowledged_at_sim=now_sim where owner_id=who and id=c.id;
      insert into public.events(owner_id,case_id,type,detail,at_sim,actor_id)
        values(who,c.id,'read','Leitura confirmada por '||(payload->>'by'),now_sim,who);
      return jsonb_build_object('id',c.id,'status','read');
    else
      if c.status not in ('read','action_taken') or coalesce(length(btrim(payload->>'action')),0)=0
        or (c.status='action_taken' and coalesce((payload->>'close')::boolean,false)=false) then
        raise exception using errcode='PT400', message='Ação inválida';
      end if;
      update public.cases set status=case when coalesce((payload->>'close')::boolean,false) then 'closed' else 'action_taken' end
        where owner_id=who and id=c.id;
      insert into public.events(owner_id,case_id,type,detail,at_sim,actor_id)
        values(who,c.id,'action_taken','Ação registrada: '||(payload->>'action'),now_sim,who);
      if coalesce((payload->>'close')::boolean,false) then
        insert into public.events(owner_id,case_id,type,detail,at_sim,actor_id)
          values(who,c.id,'closed','Caso fechado',now_sim,who);
      end if;
      return jsonb_build_object('id',c.id,'status',case when coalesce((payload->>'close')::boolean,false) then 'closed' else 'action_taken' end);
    end if;
  end if;
  raise exception using errcode='PT400', message='Operação desconhecida';
end $$;

-- Wrapper invoker público; o código com privilégios elevados permanece em schema privado.
create function public.brightline_command(operation text, payload jsonb default '{}') returns jsonb
language sql security invoker set search_path = '' as $$
  select brightline_private.command(operation,payload);
$$;
revoke all on all functions in schema brightline_private from public, anon, authenticated;
grant execute on function brightline_private.command(text,jsonb) to authenticated;
revoke all on function public.brightline_command(text,jsonb) from public, anon;
grant execute on function public.brightline_command(text,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('brightline-files','brightline-files',false,10485760,array['application/json','image/png','image/jpeg','application/pdf']);
create policy brightline_files_read on storage.objects for select to authenticated
  using(bucket_id='brightline-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy brightline_files_insert on storage.objects for insert to authenticated
  with check(bucket_id='brightline-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy brightline_files_update on storage.objects for update to authenticated
  using(bucket_id='brightline-files' and (storage.foldername(name))[1]=(select auth.uid())::text)
  with check(bucket_id='brightline-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy brightline_files_delete on storage.objects for delete to authenticated
  using(bucket_id='brightline-files' and (storage.foldername(name))[1]=(select auth.uid())::text);

notify pgrst, 'reload schema';
commit;
