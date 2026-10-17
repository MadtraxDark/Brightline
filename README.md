# Brightline

**Do achado ao cuidado.** Protótipo para identificar achados prioritários em laudos e acompanhar a comunicação até a confirmação de leitura. A IA sugere; o profissional valida. Os dados da demonstração são sintéticos.

## Estrutura

```text
Brightline/
├── frontend/                 # Aplicação React/Vite e suas dependências
│   ├── src/                  # Landing page, painel, componentes e estilos
│   │   └── data/             # Fixtures sintéticas da demonstração local
│   ├── scripts/              # Auxiliares de verificação da interface
│   ├── docs/                 # Produto e sistema visual
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/                  # API FastAPI e pipeline Python
│   ├── app/                  # Rotas, modelos, configuração e cliente Supabase
│   ├── tests/                # Testes da API e do pipeline
│   ├── data/                 # Laudos e artefatos de preparação offline
│   ├── prompts/              # Prompt de extração
│   ├── supabase/             # Migrações SQL e verificação das políticas
│   ├── docs/                 # Guia da API
│   ├── extract.py
│   ├── evaluate.py
│   ├── import_supabase.py
│   ├── brightline_data.py
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── infra/nginx/              # Proxy reverso da API
├── docs/                     # Referências e ferramentas compartilhadas
├── artifacts/                # Capturas e resultados de verificação
├── scripts/dev.mjs           # Inicialização conjunta ou individual na raiz
├── package.json              # Atalhos; dependências continuam no frontend
└── docker-compose.yml        # Orquestração da API e do proxy
```

## Rodar pela raiz

Com as dependências instaladas, abra um terminal na raiz do projeto:

```powershell
npm run dev
```

Esse comando inicia frontend e backend no mesmo terminal. Acesse [o site](http://localhost:5173), [o painel](http://localhost:5173/app) e [a documentação da API](http://localhost:8000/docs). Pressione `Ctrl+C` uma vez para encerrar os dois serviços.

Para iniciar somente um deles, também na raiz:

```powershell
npm run dev:frontend
npm run dev:backend
```

O inicializador procura primeiro o Python de `backend/.venv`, depois o de `.venv` na raiz e, por último, o Python do sistema. Os processos são executados em suas respectivas pastas automaticamente. Se um serviço falhar, o outro também é encerrado.

Na primeira execução, instale as dependências sem sair da raiz:

```powershell
npm run install:frontend
python -m venv backend/.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

Se o ambiente Python da raiz já estiver preparado, não é necessário criar outro. Mantenha a configuração em `backend/.env`; copie `backend/.env.example` somente se o arquivo ainda não existir.

`npm run build` e `npm test` na raiz executam, respectivamente, a compilação e os testes do frontend. Os comandos individuais dentro de cada pasta continuam disponíveis abaixo.

## Frontend

Requisitos: Node.js compatível com Vite 7 (20.19+ ou 22.12+) e npm. Na raiz do repositório:

```powershell
cd frontend
npm ci
npm run dev
```

O site comercial fica em `/` e o painel em `/app`. O painel usa fixtures locais, sem depender da API ou das credenciais do backend. A landing page inclui rolagem suave com Lenis.

Dentro de `frontend/`, use `npm run build` para gerar `dist/`, `npm run preview` para conferir a compilação e `npm test` para executar os testes. A hospedagem deve servir `index.html` também para `/app`.

## Backend

Requisito: Python 3.10+. Em outro terminal, a partir da raiz:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env  # somente se .env ainda não existir
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Preencha `backend/.env` com a URL e a chave publicável do Supabase antes de usar as rotas de dados. A configuração é carregada de `backend/.env`, independentemente do diretório de execução. A configuração local existente foi movida para esse caminho. Um ambiente Python anterior na `.venv/` da raiz pode continuar sendo usado pelo executável `..\.venv\Scripts\python.exe` a partir de `backend/`.

Swagger: [localhost:8000/docs](http://localhost:8000/docs). Aplique as migrações do [guia do Supabase](backend/supabase/README.md) antes de importar dados. A API usa Supabase Auth, Postgres e Storage; a inicialização não executa migrações.

Dentro de `backend/`:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe extract.py --validate-only
```

Veja o [guia completo do backend](backend/README.md) e o [guia de IA e dados](backend/IA_DADOS.md) para extração, avaliação e importação.

## Docker

Na raiz do repositório, com `backend/.env` configurado:

```powershell
docker compose --env-file backend/.env up --build -d
docker compose --env-file backend/.env ps
```

O Compose usa apenas `backend/` como contexto de build e expõe a API pelo Nginx em [localhost:8080](http://localhost:8080). O frontend é executado e compilado separadamente.

Credenciais do backend ficam em `backend/.env`, ignorado pelo Git. Não copie esse arquivo para o frontend. Os laudos e o cache offline também são locais; as fixtures da demonstração permanecem em `frontend/src/data/`.
