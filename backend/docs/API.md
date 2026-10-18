# API Brightline

API FastAPI com PostgreSQL local. Configure `DATABASE_URL` em `backend/.env`; o Docker Compose cria o banco e aplica o esquema inicial. Execute `docker compose exec api python -m backend.migrate` para aplicar migrações pendentes.

## Executar

Na raiz, para iniciar toda a stack:

```powershell
docker compose up --build -d
```

Para desenvolvimento do backend, dentro de `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Abra [Swagger](http://localhost:8000/docs) ou [health check](http://localhost:8000/health). Cadastro e login são locais, pelos endpoints `/auth/signup` e `/auth/login`. Envie o token retornado como `Authorization: Bearer <access_token>` nas rotas protegidas.

## Persistência

- Um PostgreSQL compartilhado armazena as contas e as instituições. Pacientes (por identificador da instituição), laudos, extrações, casos, eventos e arquivos recebem a instituição ativa da sessão; políticas no banco validam o vínculo do médico em cada operação.
- O cadastro recebe `institutions` (uma ou mais). O login recebe `institution_id` (uma instituição para a sessão). `PUT /auth/institutions` atualiza os vínculos e `PUT /auth/institution` troca a instituição ativa após validar o vínculo.
- IDs aceitos: `hctco_unifeso`, `hospital_sao_jose`, `beneficencia_portuguesa` e `outro_hospital`. Registros antigos permanecem no banco e são atribuídos ao HCTCO · UNIFESO pela migração.
- Arquivos JSON, PNG, JPEG e PDF são armazenados no PostgreSQL; links de leitura expiram em 60 segundos.
- `dataset_images` armazena o conjunto NIH ChestX-ray14 importado para avaliação.
- `docker compose down` mantém os dados no volume; `docker compose down -v` remove o volume.
- As notificações são eventos simulados. Nenhuma mensagem real é enviada.

Consulte o [guia do backend](../README.md) e o [guia de dados](../IA_DADOS.md) para importação e demais rotas.
