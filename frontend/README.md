# Frontend Brightline

O catálogo NIH em `/radiografias` usa a API autenticada para listar, filtrar, paginar, exibir imagens e consultar análises. O cliente está em `src/radiographApi.js`; nenhum componente acessa o PostgreSQL diretamente. Consulte [API de dados e radiografias](../docs/DATABASE_API.md).

Landing page comercial e painel demonstrativo em React/Vite. Esta pasta contém o projeto Node completo: manifesto, lockfile, configuração, fontes e scripts de interface.

Execute os comandos dentro de `frontend/`:

```powershell
npm ci
npm run dev
npm test
npm run build
```

- `/`: landing page com prévia visual, perguntas frequentes e Lenis.
- O header fica fixo e sempre inteiro: transparente e integrado ao hero no topo, com fundo azul-marinho ao rolar. No celular, o botão Menu abre navegação em tela cheia; Escape fecha o menu.
- `/home`: painel protegido com laudos da API, filtrados pelo hospital ativo.
- `/login` e `/cadastro`: autenticação real; cadastro com seleção de uma ou mais instituições e senha de pelo menos 9 caracteres.
- `src/components/`: componentes do painel.
- `src/styles/`: estilos e tokens visuais.
- `src/engine/` e `src/store/`: motor de prévias e estado em memória; casos autenticados vêm da API.
- `src/data/`: fixtures sintéticas usadas nas prévias e avaliação; não são dados de hospitais.
- `docs/`: documentação de produto e design.
- `scripts/`: auxiliares de captura e verificação para execução em uma sessão Playwright.

O painel e a autenticação usam a API FastAPI e o PostgreSQL configurado em `backend/.env`. Inicie os dois serviços com `npm run dev` na raiz. O proxy de desenvolvimento encaminha `/api` para `http://127.0.0.1:8000`; configure `BRIGHTLINE_API_TARGET` para outra API atualizada. No build, `/api` precisa de proxy no servidor ou de `VITE_AUTH_API_URL` configurada. Ao trocar o hospital, o painel invalida o estado anterior e busca novamente os dados autorizados pelo backend.

`npm run build` gera `frontend/dist/`. Use `npm run preview` para conferir esse resultado. Em hospedagem estática, configure fallback para `index.html` nas rotas da aplicação, incluindo `/home`.

Para executar comandos a partir da raiz do repositório sem trocar de pasta, use `npm --prefix frontend run dev`, `npm --prefix frontend run build` ou `npm --prefix frontend test`.
