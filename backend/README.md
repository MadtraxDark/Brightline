# Backend Brightline

API FastAPI com PostgreSQL local em Docker. Cadastro, login e sessões são gerenciados pela própria API; os dados ficam no banco `brightline` e os arquivos binários são armazenados em tabelas PostgreSQL.

## Executar

Na raiz do repositório:

```powershell
docker compose up --build -d
docker compose exec api python -m backend.migrate
```

A API fica em `http://localhost:8080`; Swagger em `/docs`. Cadastre um usuário por `/auth/signup` e faça login por `/auth/login`. Envie `Authorization: Bearer <access_token>` nas rotas protegidas.

Para desenvolvimento local fora do Docker, configure `DATABASE_URL` para um PostgreSQL acessível e instale `requirements.txt` antes de iniciar Uvicorn.

## Persistência e autorização

- Laudos, extrações, casos, eventos e relógio pertencem à conta local autenticada.
- Arquivos JSON, PNG, JPEG e PDF ficam no PostgreSQL; links de leitura expiram em 60 segundos.
- A tabela `dataset_images` guarda o conjunto NIH ChestX-ray14 usado pelo treinador TensorFlow.
- `docker compose down` mantém os dados; `docker compose down -v` apaga o volume PostgreSQL.
- Notificações são eventos simulados. Nenhuma mensagem real é enviada.

Veja o [README principal](../README.md) para rotas, importação e execução do modelo.
