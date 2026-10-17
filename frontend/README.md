# Frontend Brightline

Landing page comercial e painel demonstrativo em React/Vite. Esta pasta contém o projeto Node completo: manifesto, lockfile, configuração, fontes e scripts de interface.

Execute os comandos dentro de `frontend/`:

```powershell
npm ci
npm run dev
npm test
npm run build
```

- `/`: landing page com demonstração interativa, perguntas frequentes e Lenis.
- O header fica fixo e sempre inteiro: transparente e integrado ao hero no topo, com fundo azul-marinho ao rolar. No celular, o botão Menu abre navegação em tela cheia; Escape fecha o menu.
- `/app`: painel com laudos sintéticos, revisão e acompanhamento.
- `src/components/`: componentes do painel.
- `src/styles/`: estilos e tokens visuais.
- `src/engine/` e `src/store/`: motor e persistência da demonstração local, com testes.
- `src/data/`: fixtures sintéticas; não são os dados importados no Supabase.
- `docs/`: documentação de produto e design.
- `scripts/`: auxiliares de captura e verificação para execução em uma sessão Playwright.

O painel usa a API local simulada em `src/api.js`, adaptada por `src/dashboardApi.js`. A integração com a API FastAPI não está conectada nesta demonstração. A aplicação não precisa de `backend/.env`.

`npm run build` gera `frontend/dist/`. Use `npm run preview` para conferir esse resultado. Em hospedagem estática, configure fallback para `index.html` nas rotas da aplicação, incluindo `/app`.

Para executar comandos a partir da raiz do repositório sem trocar de pasta, use `npm --prefix frontend run dev`, `npm --prefix frontend run build` ou `npm --prefix frontend test`.
