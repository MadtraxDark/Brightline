# Brightline

**Do achado ao cuidado.** Protótipo para identificar achados prioritários em laudos de imagem e acompanhar a comunicação até a confirmação de leitura. A IA sugere e uma pessoa valida. Os dados da demonstração são sintéticos e os resultados são ilustrativos.

## Executar a aplicação

Com Node.js e Python instalados, na raiz do projeto:

```powershell
npm run dev
```

Site: `http://localhost:5173`; login em `/login`, cadastro em `/cadastro` e painel em `/home`. API: `http://localhost:8000/docs`.

O cadastro salva nome, e-mail, hash da senha e instituições vinculadas no PostgreSQL. No login, escolha uma instituição vinculada; a sessão ativa define o escopo dos dados. Contas antigas sem vínculos entram em modo restrito para configurar o perfil. Configure `DATABASE_URL` em `backend/.env` para o banco acessível (inclusive Docker em outro host). O Vite encaminha `/api` à API local na porta 8000; `BRIGHTLINE_API_TARGET` permite usar outra API atualizada.

Para iniciar os serviços separadamente, use `npm run dev:frontend` ou `npm run dev:backend`. Instale dependências com `npm run install:frontend` e `python -m pip install -r backend/requirements.txt`.

## Banco local em Docker

O PostgreSQL, a API e o Nginx são iniciados pelo Compose. O banco guarda usuários, sessões, laudos, casos, eventos e arquivos binários, com escopo por instituição; o volume `postgres_data` mantém os dados entre reinicializações.

```powershell
if (!(Test-Path .env)) { Copy-Item backend/.env.example .env }
docker compose up --build -d
docker compose exec api python -m backend.migrate
```

A API fica em `http://localhost:8080`. O PostgreSQL é publicado em `localhost:5433` por padrão, configurável em `.env`. Consulte `GET /institutions`, cadastre com `institutions` em `POST /auth/signup` e use `institution_id` no `POST /auth/login`.

`docker compose down` preserva o banco. `docker compose down -v` remove o volume e os dados persistidos.

O conjunto NIH ChestX-ray14 foi importado para `dataset_images` no PostgreSQL; os arquivos de imagem não precisam estar no repositório.

## Documentação

- [Guia do backend](backend/README.md)
- [Extração e avaliação dos dados](backend/IA_DADOS.md)
- [Documentação da API](backend/docs/API.md)
- [API de dados e radiografias](docs/DATABASE_API.md)
- [Frontend](frontend/README.md)

A autenticação e os dados de laudos/casos do painel usam a API. A prévia da landing page e a avaliação da IA usam conteúdo sintético. O schema não tem uma entidade de pacientes. Não há integração PACS/HL7/FHIR nem envio real de mensagens.

## Trocar os dados

- `frontend/src/data/reports.json`: laudos.
- `frontend/src/data/extractions_cache.json`: achados extraídos de cada laudo.
- `frontend/src/data/evaluation.json`: números e listas da tela Avaliação da IA. Enquanto forem dados de exemplo, mantenha `"example": true`.

## Zerar a demo

Use o botão **Resetar demo** no relógio da barra lateral para reiniciar os casos da instituição ativa.
