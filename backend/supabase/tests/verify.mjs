// Valida a migração em Postgres embarcado. Não acessa o Supabase remoto.
// Dependência de desenvolvimento: @electric-sql/pglite em .validation/node_modules.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import('../../../.validation/node_modules/@electric-sql/pglite/dist/index.js');
const db = new PGlite();
await db.exec(`
  create role anon;
  create role authenticated;
  create schema auth;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
  create schema storage;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated;
  grant select,insert,update,delete on storage.objects to authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as
    'select string_to_array(name,''/'')';
`);
await db.exec(await readFile(new URL('../migrations/202610170001_brightline.sql', import.meta.url), 'utf8'));
const user1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const user2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
await db.query('insert into auth.users values($1),($2)', [user1,user2]);
async function asUser(id) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec('set role authenticated');
}
async function command(op,payload={}) {
  const r=await db.query('select public.brightline_command($1,$2::jsonb) as result',[op,JSON.stringify(payload)]);
  return r.rows[0].result;
}
async function fails(fn,code) {
  await assert.rejects(fn, error=>error.code===code);
}
const report={report_id:'T-01', modality:'TC', radiologist:'Radiologista fictício', ordering_physician:'Solicitante fictício',
  text:'Hemorragia aguda. Nódulo suspeito.', flagged_by_radiologist:false, ground_truth:[]};
const data={reports:[report], extractions:{'T-01':{report_id:'T-01', findings:[
  {finding:'hemorragia aguda',evidence:'Hemorragia aguda.',urgency:'critical',deadline_hours:1,confidence:'high'},
  {finding:'nódulo suspeito',evidence:'Nódulo suspeito.',urgency:'actionable',deadline_hours:720,confidence:'high'}]}}};
await asUser(user1);
assert.equal((await command('import',data)).cases,2);
let rows=(await db.query('select * from public.cases order by deadline_hours')).rows;
const critical=rows[0].id;
assert.equal(rows[0].current_target, report.ordering_physician);
await fails(()=>db.exec("update public.cases set status='closed'"),'42501');
await fails(()=>command('action',{id:critical,action:'teste',close:true}),'PT400');
assert.equal((await command('advance',{hours:24})).changed_cases[0].escalation_level,1);
assert.equal((await command('advance',{hours:2})).changed_cases[0].escalation_level,2);
await command('advance',{hours:2});
await command('advance',{hours:2});
assert.equal((await db.query("select count(*)::integer as n from public.events where type='coordination_overdue'")).rows[0].n,1);
assert.equal((await command('acknowledge',{id:critical,by:'Médico fictício'})).status,'read');
await command('advance',{hours:2});
assert.equal((await command('action',{id:critical,action:'Avaliação humana registrada',close:true})).status,'closed');
await fails(()=>command('acknowledge',{id:critical,by:'X'}),'PT400');
await fails(()=>command('advance',{hours:-1}),'PT400');
// Outro usuário não vê casos nem consegue afetar casos alheios.
await asUser(user2);
assert.equal((await db.query('select * from public.cases')).rows.length,0);
await fails(()=>command('acknowledge',{id:critical,by:'X'}),'PT404');
await command('reset');
assert.equal((await db.query('select * from public.cases')).rows.length,0);
await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['brightline-files',`${user2}/test.json`]);
await fails(()=>db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['brightline-files',`${user1}/test.json`]),'42501');
await asUser(user1);
assert.equal((await db.query('select * from storage.objects')).rows.length,0);
assert.equal((await db.query('select * from public.cases')).rows.length,2);
// Importação inválida não substitui os dados anteriores.
const invalid=structuredClone(data);
invalid.extractions['T-01'].findings[0].evidence='inventado';
await fails(()=>command('import',invalid),'PT400');
assert.equal((await db.query('select * from public.cases')).rows.length,2);
assert.equal((await command('reset')).cases,2);
assert.equal((await db.query('select count(*)::integer as n from public.events')).rows[0].n,4);
assert.equal((await db.query('select sim_now from public.sim_state')).rows[0].sim_now,0);
await db.exec('reset role; set role anon');
await fails(()=>command('reset'),'42501');
await fails(()=>db.query('select * from public.reports'),'42501');
await db.close();
console.log('OK: migração, importação atômica, transições, escalonamento, reset, RLS e Storage entre duas contas.');
