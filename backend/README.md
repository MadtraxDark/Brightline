# Backend Brightline

API FastAPI com PostgreSQL local em Docker. Cadastro, login e sessões são gerenciados pela API; os dados e arquivos JSON, PNG, JPEG e PDF ficam no PostgreSQL.

## Executar com Docker

Na raiz do repositório:

```powershell
if (!(Test-Path .env)) { Copy-Item backend/.env.example .env }
docker compose up --build -d
docker compose exec api python -m backend.migrate
```

A API fica em `http://localhost:8080` e o Swagger em `/docs`. Consulte `GET /institutions`, cadastre uma conta com `institutions` em `POST /auth/signup` e entre em `POST /auth/login` informando `institution_id`. Envie `Authorization: Bearer <access_token>` nas rotas protegidas.

O banco publica a porta `5433` no host por padrão. `docker compose down` preserva os dados no volume `postgres_data`; `docker compose down -v` apaga o volume.

## Desenvolvimento local

Execute os comandos dentro de `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env  # somente se .env ainda não existir
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Configure `DATABASE_URL` em `backend/.env` para apontar a um PostgreSQL acessível. Para importar laudos e extrações validadas, use `import_local.py`; os detalhes estão em [IA_DADOS.md](IA_DADOS.md).

O cadastro recebe `name`, `email`, `password` (mínimo de 9 caracteres) e uma lista `institutions`. As senhas usam PBKDF2 com salt individual; tokens de sessão são armazenados apenas como hash. O acesso expira em uma hora e a renovação em sete dias. Para bancos existentes, execute `python -m backend.migrate`; a migração `004_institutions` preserva registros antigos com escopo `__legacy__`, sem atribuí-los a um hospital. Contas antigas sem vínculo podem entrar em modo restrito e escolher vínculos nas configurações. Em produção, sirva frontend e `/api` por HTTPS, ou configure `VITE_AUTH_API_URL` no build e a origem permitida no backend.

## Dados e arquivos

- Laudos, extrações, casos, eventos, relógio e arquivos pertencem à combinação da conta autenticada e da instituição ativa.
- Arquivos JSON, PNG, JPEG e PDF ficam no PostgreSQL; links de leitura expiram em 60 segundos.
- `dataset_images` contém as imagens NIH ChestX-ray14 usadas pelo treinador TensorFlow.
- Notificações são eventos simulados. Nenhuma mensagem real é enviada.

Consulte a [documentação da API](docs/API.md) e o [README principal](../README.md).
