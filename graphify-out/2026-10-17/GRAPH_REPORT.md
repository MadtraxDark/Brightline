# Graph Report - Brightline  (2026-10-17)

## Corpus Check
- 103 files · ~88,527 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: (none) 4, .css 4, .keras 2)

## Summary
- 680 nodes · 1355 edges · 41 communities (25 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `54aad549`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- engine.test.js
- cal.DESIGN.md
- check-data.js
- test_ai_pipeline.py
- Extração e avaliação do Brightline
- session.js
- main.py
- App.jsx
- scripts
- 002_dataset_images.sql
- Graphify project instructions
- report_analysis.py
- Commit conventions
- reset
- init.sql
- scripts
- dev.mjs
- Brightline — sistema visual
- Evaluation.jsx
- Revisão dos laudos sintéticos Brightline
- LandingPage.jsx
- scripts/evaluate.js
- store.test.js
- Brightline: regras de design
- design-tools.md
- PRODUCT.md
- NIH_TENSORFLOW.md
- lib/evaluate.js
- LANDING.md
- frontend/package.json
- dependencies
- dashboardApi.js
- main.jsx

## God Nodes (most connected - your core abstractions)
1. `db()` - 23 edges
2. `react` - 18 edges
3. `Shell()` - 18 edges
4. `CaseDetail()` - 18 edges
5. `analyze_report()` - 17 edges
6. `scripts` - 15 edges
7. `createStore()` - 15 edges
8. `PipelineTests` - 14 edges
9. `lucide-react` - 13 edges
10. `selectCases()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Extração, privacidade e fila` --references--> `cases()`  [INFERRED]
  backend/docs/REPORT_ANALYSIS.md → backend/app/main.py
- `confirmRead()` --calls--> `acknowledge()`  [EXTRACTED]
  frontend/src/dashboardApi.js → frontend/src/api.js
- `submitAction()` --indirect_call--> `closeCase()`  [INFERRED]
  frontend/src/components/CaseDetail.jsx → frontend/src/dashboardApi.js
- `FastAPI backend` --conceptually_related_to--> `FastAPI dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt
- `FastAPI backend` --conceptually_related_to--> `HTTPX dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt

## Import Cycles
- None detected.

## Communities (41 total, 16 thin omitted)

### Community 0 - "engine.test.js"
Cohesion: 0.07
Nodes (41): getStats(), listCases(), listMissed(), acknowledge(), advance(), clone(), currentTarget(), getMissed() (+33 more)

### Community 1 - "cal.DESIGN.md"
Cohesion: 0.05
Nodes (38): Border Radius Scale, Brand & Accent, Breakpoints, Buttons, Cards & Containers, Collapsing Strategy, Colors, Components (+30 more)

### Community 2 - "check-data.js"
Cohesion: 0.09
Nodes (19): byId, byUrgency, cache, checkList(), confidences, dataDir, deadlines, doctors (+11 more)

### Community 3 - "test_ai_pipeline.py"
Cohesion: 0.06
Nodes (33): get_settings(), Settings, _extract_report(), lifespan(), load_reports(), read_json(), validate_extraction(), write_json() (+25 more)

### Community 4 - "Extração e avaliação do Brightline"
Cohesion: 0.08
Nodes (22): API Brightline, Executar, Persistência, Análise de laudos, Extração, privacidade e fila, Requisição, Resposta, Arquivos (+14 more)

### Community 5 - "session.js"
Cohesion: 0.12
Nodes (17): App(), RequireAuth(), Login(), onSubmit(), Register(), cases, PROFILE_KEY, isAuthenticated() (+9 more)

### Community 6 - "main.py"
Cohesion: 0.06
Nodes (44): acknowledge(), action(), advance(), analyze_report(), authenticated(), case_detail(), cases(), clock() (+36 more)

### Community 7 - "App.jsx"
Cohesion: 0.07
Nodes (47): acknowledge(), advance(), getCase(), registerAction(), crumb(), Overview(), Shell(), SUMMARY (+39 more)

### Community 8 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, check:data, dev, prebuild, preview, test, test:engine (+7 more)

### Community 11 - "report_analysis.py"
Cohesion: 0.07
Nodes (12): compare(), find_text_classes(), infer(), initialize_model(), laterality(), load_model(), _model(), read_metrics() (+4 more)

### Community 13 - "reset"
Cohesion: 0.24
Nodes (4): reset(), ErrorBoundary, ErrorFallback(), resetDemo()

### Community 14 - "init.sql"
Cohesion: 0.21
Nodes (17): cases, cases_owner_order, dataset_images, dataset_images_labels_gin, events, events_case_order, extractions, file_links (+9 more)

### Community 15 - "scripts"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, dev, dev:backend, dev:frontend, install:frontend (+2 more)

### Community 16 - "dev.mjs"
Cohesion: 0.22
Nodes (6): children, localPython, root, start(), stop(), vite

### Community 17 - "Brightline — sistema visual"
Cohesion: 0.13
Nodes (13): Referência visual, Barras de rolagem, Brightline — sistema visual, Cadastro, Continuidade da navegação, Direção aprovada, Hierarquia, Identidade (+5 more)

### Community 18 - "Evaluation.jsx"
Cohesion: 0.20
Nodes (10): cards, FindingList(), precisionOverall, recallCritical, recallOverall, swapped, swappedKey(), formatPercent() (+2 more)

### Community 19 - "Revisão dos laudos sintéticos Brightline"
Cohesion: 0.29
Nodes (6): Cobertura dos casos difíceis, Composição, Inventário para revisão do gabarito, Referências consultadas, Revisão dos laudos sintéticos Brightline, Semelhanças para revisar com Bruno

### Community 20 - "LandingPage.jsx"
Cohesion: 0.14
Nodes (14): benefits, BenefitsCarousel(), LandingHeader(), links, examples, LandingPage(), ProductPreview(), questions (+6 more)

### Community 21 - "scripts/evaluate.js"
Cohesion: 0.18
Nodes (8): cache, computed, current, dataDir, found, next, reports, write

### Community 22 - "store.test.js"
Cohesion: 0.25
Nodes (5): STORAGE_KEY, fakeTimers(), fixtureData, fixtureDir, openStore()

### Community 29 - "lib/evaluate.js"
Cohesion: 0.60
Nodes (5): byReportId(), computeEvaluation(), listItem(), normalizeName(), sameFinding()

### Community 37 - "frontend/package.json"
Cohesion: 0.20
Nodes (9): devDependencies, vite, @vitejs/plugin-react, name, private, type, version, vite (+1 more)

### Community 38 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, @fontsource/atkinson-hyperlegible-next, @fontsource/source-serif-4, gsap, lenis, lucide-react, react, react-dom (+1 more)

### Community 39 - "dashboardApi.js"
Cohesion: 0.31
Nodes (8): closeCase(), confirmRead(), dashboardCase(), getCase(), getCases(), getStats(), NETWORK_ERROR, registerAction()

### Community 40 - "main.jsx"
Cohesion: 0.29
Nodes (3): @fontsource/atkinson-hyperlegible-next, @fontsource/source-serif-4, react-dom

## Knowledge Gaps
- **7 isolated node(s):** `Graphify workflow instructions`, `Commit message instructions`, `FastAPI dependency`, `HTTPX dependency`, `python-dotenv dependency` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 279 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cases()` connect `main.py` to `Extração e avaliação do Brightline`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Shell()` (e.g. with `closeOnEscape()` and `closeOnOutside()`) actually correct?**
  _`Shell()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Graphify workflow instructions`, `Commit message instructions`, `FastAPI dependency` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `engine.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Why does `Extração, privacidade e fila` connect `Extração e avaliação do Brightline` to `main.py`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `cal.DESIGN.md` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `App.jsx` to `Evaluation.jsx`, `session.js`, `LandingPage.jsx`, `frontend/package.json`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._