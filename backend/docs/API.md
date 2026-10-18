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

Abra [Swagger](http://localhost:8000/docs) ou [health check](http://localhost:8000/health). Consulte `GET /institutions`, envie uma ou mais instituições no cadastro (`POST /auth/signup`) e uma instituição ativa no login (`POST /auth/login`). Envie o token retornado como `Authorization: Bearer <access_token>` nas rotas protegidas.

## Persistência

- Cada combinação conta/instituição possui seus laudos, extrações, casos, eventos, relógio e arquivos.
- `POST /auth/active-institution` troca o contexto ativo da sessão; `GET /auth/institutions` consulta os vínculos e `POST /auth/institutions` os atualiza. O backend valida o vínculo em todas as operações institucionais.
- `GET/POST /reports`, `GET/PUT/DELETE /reports/{report_id}`, `/cases`, `/simulate` e `/files` aplicam o escopo da instituição ativa.
- A migração `004_institutions` altera somente tabelas existentes. Registros antigos recebem o escopo `__legacy__` e ficam preservados, mas indisponíveis nos hospitais até que haja uma associação confiável.
- O schema atual não possui uma entidade de pacientes nem campos que identifiquem pacientes nos laudos. Não criei operações de pacientes baseadas em IDs de laudo; isso exige uma decisão de modelagem compatível com a regra de não criar tabelas.
- Arquivos JSON, PNG, JPEG e PDF são armazenados no PostgreSQL; links de leitura expiram em 60 segundos.
- `dataset_images` armazena o conjunto NIH ChestX-ray14 usado pelo treinador TensorFlow.
- `docker compose down` mantém os dados no volume; `docker compose down -v` remove o volume.
- As notificações são eventos simulados. Nenhuma mensagem real é enviada.

Consulte o [guia do backend](../README.md) e o [guia de dados](../IA_DADOS.md) para importação e demais rotas.
