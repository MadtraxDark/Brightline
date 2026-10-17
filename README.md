# Brightline

Protótipo para identificar achados prioritários em laudos de imagem e acompanhar a comunicação até a confirmação de leitura. A IA sugere e uma pessoa valida. Os laudos são sintéticos; os resultados são ilustrativos e não representam desempenho clínico.

## Arquitetura local

O projeto usa PostgreSQL em Docker. Usuários, sessões, laudos, extrações, casos, eventos, relógio da simulação e arquivos (incluindo PNG/JPEG/PDF) ficam no banco local persistido no volume `postgres_data`. A API FastAPI faz autenticação local e restringe os dados e arquivos ao usuário autenticado.

```text
dados e extrações → API FastAPI → PostgreSQL (Docker + volume persistente)
                                      ├── usuários e sessões
                                      ├── laudos, casos, eventos e simulação
                                      └── imagens, PDFs e JSON (bytea)
```

## Executar com Docker

Requisito: Docker Desktop com Compose. Se ainda não houver `.env`, copie os valores locais de exemplo e inicie os serviços:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
docker compose up --build -d
```

A API fica em `http://localhost:8080`. O PostgreSQL fica disponível em `localhost:5433` (porta padrão, configurável por `POSTGRES_PORT`). A API se conecta ao banco pela rede interna do Docker. O esquema é criado automaticamente no primeiro início do volume. Para verificar a API, abra `http://localhost:8080/health`.

Crie uma conta pela API:

```powershell
$user = Invoke-RestMethod -Method Post http://localhost:8080/auth/signup `
  -ContentType 'application/json' `
  -Body '{"email":"voce@exemplo.com","password":"uma-senha-segura"}'
$token = $user.access_token
```

Para parar os serviços, preservando o banco:

```powershell
docker compose down
```

Para apagar também todos os dados persistidos, remova o volume com `docker compose down -v`.

## Preparar e importar dados

Os arquivos de `data/` são material de preparação e avaliação offline. A extração pode usar o Anthropic como serviço externo; a persistência da aplicação é local.

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
.\.venv\Scripts\python.exe extract.py
.\.venv\Scripts\python.exe import_local.py --validate-only
```

Depois de criar a conta, informe o token recebido:

```powershell
$env:BRIGHTLINE_ACCESS_TOKEN = $token
.\.venv\Scripts\python.exe import_local.py --replace
```

`--replace` substitui os laudos e extrações do usuário autenticado e reinicia os casos e a simulação.

## Rotas da API

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/health` | Verificar o processo da API |
| GET | `/ready` | Verificar sessão e acesso ao banco |
| POST | `/auth/signup` | Criar conta local |
| POST | `/auth/login` | Criar sessão |
| POST | `/auth/refresh` | Renovar sessão |
| GET | `/auth/me` | Consultar usuário autenticado |
| POST | `/auth/logout` | Encerrar sessão |
| POST | `/imports` | Substituir dados do usuário e criar casos |
| GET | `/cases?urgency=&status=` | Listar casos |
| GET | `/cases/{id}` | Consultar laudo, caso e eventos |
| POST | `/cases/{id}/acknowledge` | Confirmar leitura |
| POST | `/cases/{id}/action` | Registrar ação |
| GET | `/simulate` | Consultar relógio simulado |
| POST | `/simulate/advance?hours=N` | Avançar relógio e processar escalonamentos |
| POST | `/simulate/reset` | Recriar casos dos dados importados |
| GET | `/missed` | Listar casos críticos/urgentes não sinalizados |
| GET | `/stats` | Contagens e tempo médio até confirmação |
| POST | `/files` | Armazenar JSON, PNG, JPEG ou PDF (até 10 MB) no PostgreSQL |
| POST | `/files/{file_id}/signed-url` | Criar link de leitura válido por 60 segundos |

Todas as rotas de dados exigem `Authorization: Bearer <access_token>`. Cada usuário só acessa seus próprios registros e arquivos. Os prazos do protótipo são crítico 1h, urgente 24h e acionável 720h; não são protocolos clínicos.

## Banco de imagens NIH

O conjunto de 1.387 imagens NIH ChestX-ray14 foi carregado na tabela `dataset_images` do PostgreSQL (531 MB de conteúdo). Os PNGs foram removidos do workspace; o treinador TensorFlow lê as imagens diretamente do banco. Para recriar o conjunto a partir da fonte, consulte [NIH_TENSORFLOW.md](NIH_TENSORFLOW.md).

```powershell
docker compose exec api python -m backend.migrate
docker compose run --rm -v "${PWD}/data/nih-chestxray14:/data/nih:ro" api python -m backend.import_nih_images --data-dir /data/nih
```

Antes de repetir a carga após remover os PNGs locais, baixe novamente o conjunto com `download_nih_sample.py`.

## Extração e avaliação

```powershell
.\.venv\Scripts\python.exe extract.py
.\.venv\Scripts\python.exe evaluate.py
```

Extrações incompletas são preservadas como pendências; evidências precisam aparecer literalmente no laudo. A avaliação gera `data/evaluation.json` com precisão, recall, recall crítico, falsos positivos e falsos negativos.

## Estrutura

```text
backend/app/          API e modelos
backend/init.sql      esquema inicial do PostgreSQL
data/                 laudos e resultados offline
docker-compose.yml    PostgreSQL, API e Nginx
import_local.py       importação autenticada para a API local
```

O protótipo não tem frontend, análise direta de imagens, integração PACS/HL7/FHIR ou envio real de mensagens.
