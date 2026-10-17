# Backend Brightline

API FastAPI com **Supabase Postgres, Auth e Storage**. O backend usa a chave publicável e o JWT de cada usuário; não usa banco local nem chave administrativa.

## Configuração

Na raiz do repositório, copie `.env.example` para `.env` se ainda não houver configuração e preencha `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`. As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` também são aceitas. O `.env` sempre é carregado a partir da raiz, independentemente do diretório de execução.

Aplique a migração descrita no [guia do Supabase](../supabase/README.md) antes de usar as rotas de dados. A inicialização da API não executa DDL nem cria usuários.

## Executar no PowerShell

A partir da raiz:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload
```

Caso esteja dentro de `backend`, use o mesmo ambiente da raiz:

```powershell
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Abra [Swagger](http://localhost:8000/docs). Cadastre-se por `/auth/signup`, confirme o e-mail se necessário e faça login em `/auth/login`. Informe o `access_token` no botão **Authorize**. `/auth/me` consulta o usuário; `/ready` verifica também as tabelas.

## Persistência e autorização

- Cada conta possui seus laudos, extrações, casos, eventos e relógio.
- RLS restringe leitura à conta dona dos dados. Escritas de domínio passam por uma RPC transacional, que verifica `auth.uid()` e as transições permitidas.
- O schema privado não deve ser exposto na Data API.
- Arquivos ficam no bucket privado `brightline-files`, na pasta do ID do usuário, com limite de 10 MB. A API gera nomes e URLs de leitura com validade de 60 segundos.
- O reset usa os dados persistidos no Supabase; a importação substitui somente o conjunto da conta autenticada.
- As notificações são eventos simulados. Nenhuma mensagem real é enviada.

O frontend deve guardar e renovar a sessão com Supabase Auth. OAuth, MFA e recuperação de senha são recursos do provedor, mas seus fluxos de interface ainda não foram implementados. Não existe frontend neste repositório.

Rotas, comandos de importação e instruções de testes estão no [README principal](../README.md).
