# Configurar o Supabase

O projeto usa Supabase Postgres para dados e transações, Auth para identidade e sessões e Storage para arquivos. O cliente de IA continua sendo a API Anthropic.

## Aplicar ao projeto

1. No dashboard do projeto, abra **SQL Editor**.
2. Execute todo o arquivo [202610170001_brightline.sql](migrations/202610170001_brightline.sql), uma única vez.
3. Confira as tabelas `reports`, `extractions`, `cases`, `events` e `sim_state`, todas com RLS habilitada.
4. Confira o bucket privado `brightline-files` e suas quatro políticas.
5. Mantenha `brightline_private` fora da lista de schemas expostos pela Data API. Apenas o wrapper `public.brightline_command` deve ser exposto.
6. Em Authentication, habilite Email e configure URL do site, redirecionamentos e confirmação de e-mail para o ambiente usado.

A migração é transacional: se ocorrer conflito com uma tabela ou bucket existente, a transação falha sem apagar os dados anteriores. Revise o conflito; não apague tabelas para contorná-lo sem conferir seu conteúdo. Aplicações subsequentes devem usar novas migrações incrementais.

URL e chave publicável não concedem permissão para DDL. É necessário executar o SQL como administrador no dashboard ou por um processo de migração autenticado. Não coloque senha do banco, chave administrativa ou token de gerenciamento no frontend.

## Configuração da aplicação

O `.env` da raiz usa:

```dotenv
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUBSTITUA
BRIGHTLINE_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Também são aceitos os nomes `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e, por compatibilidade, `SUPABASE_ANON_KEY`. Não use chave secret/service_role. Só a URL e a chave publicável podem futuramente ser expostas no Vite. JWTs de usuários não devem ser colocados em variáveis `VITE_*`.

Não são necessários driver SQL, senha Postgres ou conexão direta: o backend chama as APIs HTTP do Supabase com a chave publicável e o token da conta. `/ready` verifica a sessão e o acesso à tabela de relógio; `/health` verifica apenas o processo.

## Modelo de acesso

- Toda linha tem `owner_id`, relacionado ao usuário autenticado.
- Uma conta só lê suas linhas. Um mesmo `report_id` pode existir em contas diferentes.
- Usuários autenticados não têm INSERT/UPDATE/DELETE direto nas tabelas do domínio. A RPC valida o dono, serializa comandos da conta e aplica as transições.
- O código privilegiado fica no schema privado, com `search_path` fixo e referências qualificadas. O wrapper público usa `security invoker`.
- Eventos registram o `actor_id` real do usuário e o nome informado na simulação.
- `import` e `reset` afetam somente a conta autenticada. A importação completa e a criação dos casos acontecem na mesma transação.
- Storage exige que a primeira pasta seja o ID do usuário. URLs assinadas permitem leitura temporária a quem possuir o link.

Esse modelo é individual. Compartilhamento por equipe, organização ou hospital precisa de tabelas de membros e políticas próprias; não é concedido automaticamente a todo usuário cadastrado.

## Sessões

O backend expõe cadastro, login, renovação, consulta e logout usando Supabase Auth. Quando confirmação de e-mail está habilitada, signup pode retornar somente o usuário; login requer confirmação. O cliente deve substituir os dois tokens quando renovar a sessão. Logout local revoga a renovação da sessão, mas o JWT emitido pode continuar válido até expirar.

O frontend ainda não existe. Quando for implementado, prefira o SDK oficial Supabase para persistência e renovação da sessão e envie o access token nas requisições FastAPI. Recursos como OAuth, MFA e recuperação de senha precisam de configuração do provedor e fluxos de interface adicionais.

## Verificação local do SQL

Além dos testes Python, a migração pode ser executada em Postgres embarcado, sem acessar um projeto remoto:

```powershell
pnpm --dir .validation add @electric-sql/pglite@0.5.10
node supabase/tests/verify.mjs
```

O teste cria um banco em memória e substitutos mínimos dos schemas `auth` e `storage`. Aplica a migração e verifica importação, evidência inválida, transições, escalonamento até coordenação, leitura, fechamento, reset, acesso anônimo negado e isolamento entre duas contas, inclusive no Storage. A pasta `.validation` está ignorada pelo Git.

Isso valida o SQL e suas políticas em Postgres. Não substitui a verificação no Supabase real de Auth, PostgREST, entrega de e-mails ou URLs assinadas.

## Verificação após aplicar a migração

1. Cadastre duas contas de teste e confirme os e-mails quando exigido.
2. Faça login, use o token no Swagger e confira `/ready`.
3. Importe os laudos/cache completos na primeira conta com `import_supabase.py --email ... --replace`.
4. Confira os casos e eventos; avance o relógio, confirme leitura e feche um caso.
5. Na segunda conta, confira que a lista de casos está vazia e o ID de um caso da primeira retorna 404.
6. Envie um arquivo JSON, gere uma URL assinada e confira a leitura durante a validade.

As etapas acima alteram somente os dados das contas de teste utilizadas. A importação substitui o conjunto da conta autenticada.

## Referências

- [Auth](https://supabase.com/docs/guides/auth)
- [Chaves de API](https://supabase.com/docs/guides/api/api-keys)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Controle de acesso do Storage](https://supabase.com/docs/guides/storage/security/access-control)
- [Buckets privados](https://supabase.com/docs/guides/storage/buckets/fundamentals)
