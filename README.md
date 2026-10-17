# Brightline

**Do achado ao cuidado.** Protótipo para identificar achados prioritários em laudos de imagem e acompanhar a comunicação até a confirmação de leitura. A IA sugere e uma pessoa valida. Os dados da demonstração são sintéticos e os resultados são ilustrativos.

## Executar a aplicação

Com Node.js e Python instalados, na raiz do projeto:

```powershell
npm run dev
```

Frontend: `http://localhost:5173`; painel demonstrativo: `http://localhost:5173/app`; API: `http://localhost:8000/docs`.

Para iniciar os serviços separadamente, use `npm run dev:frontend` ou `npm run dev:backend`. Instale dependências com `npm run install:frontend` e `python -m pip install -r backend/requirements.txt`.

## Banco local em Docker

O PostgreSQL, a API e o Nginx são iniciados pelo Compose. O banco guarda usuários, sessões, laudos, casos, eventos e arquivos binários; o volume `postgres_data` mantém os dados entre reinicializações.

```powershell
if (!(Test-Path .env)) { Copy-Item backend/.env.example .env }
docker compose up --build -d
docker compose exec api python -m backend.migrate
```

A API fica em `http://localhost:8080`. O PostgreSQL é publicado em `localhost:5433` por padrão, configurável em `.env`. Crie uma conta por `POST /auth/signup` e use `Authorization: Bearer <access_token>` nas rotas protegidas.

`docker compose down` preserva o banco. `docker compose down -v` remove o volume e os dados persistidos.

O conjunto NIH ChestX-ray14 foi importado para `dataset_images` no PostgreSQL; os arquivos de imagem não precisam estar no repositório. Para importar novamente, consulte [NIH_TENSORFLOW.md](backend/NIH_TENSORFLOW.md).

## Documentação

- [Guia do backend](backend/README.md)
- [Extração e avaliação dos dados](backend/IA_DADOS.md)
- [Documentação da API](backend/docs/API.md)
- [Frontend](frontend/README.md)

O frontend demonstrativo usa fixtures locais e ainda não está conectado à API. Não há integração PACS/HL7/FHIR nem envio real de mensagens.
