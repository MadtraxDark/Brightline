# Graph Report - Brightline  (2026-10-17)

## Corpus Check
- 98 files · ~86,390 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .css 4, (none) 3, .keras 2)

## Summary
- 609 nodes · 1225 edges · 34 communities (19 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cb7854dc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- engine.test.js
- cal.DESIGN.md
- ref_node_assert
- test_ai_pipeline.py
- Extração e avaliação do Brightline
- check-data.js
- main.py
- App.jsx
- store.test.js
- session.test.js
- Graphify project instructions
- Commit conventions
- Evaluation.jsx
- scripts
- dev.mjs
- Brightline — sistema visual
- Revisão dos laudos sintéticos Brightline
- frontend/package.json
- scripts/evaluate.js
- Brightline: regras de design
- design-tools.md
- PRODUCT.md
- NIH_TENSORFLOW.md
- lib/evaluate.js
- reset

## God Nodes (most connected - your core abstractions)
1. `db()` - 22 edges
2. `react` - 18 edges
3. `Shell()` - 18 edges
4. `CaseDetail()` - 18 edges
5. `scripts` - 15 edges
6. `createStore()` - 15 edges
7. `PipelineTests` - 14 edges
8. `lucide-react` - 13 edges
9. `selectCases()` - 13 edges
10. `read_json()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Landing page Brightline` --references--> `loadCases()`  [INFERRED]
  frontend/docs/LANDING.md → frontend/src/engine/engine.js
- `FastAPI backend` --conceptually_related_to--> `FastAPI dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt
- `FastAPI backend` --conceptually_related_to--> `HTTPX dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt
- `FastAPI backend` --conceptually_related_to--> `python-dotenv dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt
- `FastAPI backend` --conceptually_related_to--> `Uvicorn dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt

## Import Cycles
- None detected.

## Communities (34 total, 15 thin omitted)

### Community 0 - "engine.test.js"
Cohesion: 0.05
Nodes (54): Landing page Brightline, acknowledge(), getCase(), getStats(), listCases(), listMissed(), registerAction(), run() (+46 more)

### Community 1 - "cal.DESIGN.md"
Cohesion: 0.05
Nodes (38): Border Radius Scale, Brand & Accent, Breakpoints, Buttons, Cards & Containers, Collapsing Strategy, Colors, Components (+30 more)

### Community 2 - "ref_node_assert"
Cohesion: 0.23
Nodes (3): cases, splitEvidence(), joined()

### Community 3 - "test_ai_pipeline.py"
Cohesion: 0.05
Nodes (32): get_settings(), Settings, lifespan(), load_reports(), read_json(), validate_extraction(), write_json(), evaluate() (+24 more)

### Community 4 - "Extração e avaliação do Brightline"
Cohesion: 0.10
Nodes (18): API Brightline, Executar, Persistência, Arquivos, Executar no PowerShell, Extração e avaliação do Brightline, Importar no PostgreSQL local, Interpretar a avaliação (+10 more)

### Community 5 - "check-data.js"
Cohesion: 0.09
Nodes (19): byId, byUrgency, cache, checkList(), confidences, dataDir, deadlines, doctors (+11 more)

### Community 6 - "main.py"
Cohesion: 0.06
Nodes (42): acknowledge(), action(), advance(), authenticated(), case_detail(), cases(), clock(), command() (+34 more)

### Community 7 - "App.jsx"
Cohesion: 0.06
Nodes (50): crumb(), Overview(), Shell(), SUMMARY, summaryValue(), benefits, BenefitsCarousel(), CaseDetail() (+42 more)

### Community 8 - "store.test.js"
Cohesion: 0.25
Nodes (5): STORAGE_KEY, fakeTimers(), fixtureData, fixtureDir, openStore()

### Community 9 - "session.test.js"
Cohesion: 0.21
Nodes (14): App(), RequireAuth(), Login(), onSubmit(), Register(), PROFILE_KEY, isAuthenticated(), login() (+6 more)

### Community 14 - "Evaluation.jsx"
Cohesion: 0.19
Nodes (11): cards, Evaluation(), FindingList(), precisionOverall, recallCritical, recallOverall, swapped, swappedKey() (+3 more)

### Community 15 - "scripts"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, dev, dev:backend, dev:frontend, install:frontend (+2 more)

### Community 16 - "dev.mjs"
Cohesion: 0.22
Nodes (6): children, localPython, root, start(), stop(), vite

### Community 17 - "Brightline — sistema visual"
Cohesion: 0.13
Nodes (13): Referência visual, Barras de rolagem, Brightline — sistema visual, Cadastro, Continuidade da navegação, Direção aprovada, Hierarquia, Identidade (+5 more)

### Community 19 - "Revisão dos laudos sintéticos Brightline"
Cohesion: 0.29
Nodes (6): Cobertura dos casos difíceis, Composição, Inventário para revisão do gabarito, Referências consultadas, Revisão dos laudos sintéticos Brightline, Semelhanças para revisar com Bruno

### Community 21 - "frontend/package.json"
Cohesion: 0.05
Nodes (38): dependencies, @fontsource/atkinson-hyperlegible-next, @fontsource/source-serif-4, gsap, lenis, lucide-react, react, react-dom (+30 more)

### Community 22 - "scripts/evaluate.js"
Cohesion: 0.18
Nodes (8): cache, computed, current, dataDir, found, next, reports, write

### Community 30 - "lib/evaluate.js"
Cohesion: 0.60
Nodes (5): byReportId(), computeEvaluation(), listItem(), normalizeName(), sameFinding()

### Community 31 - "reset"
Cohesion: 0.18
Nodes (10): advance(), reset(), DemoClock(), onAdvance(), onReset(), showStatus(), escalatedLine(), ErrorBoundary (+2 more)

## Knowledge Gaps
- **7 isolated node(s):** `Graphify workflow instructions`, `Commit message instructions`, `FastAPI dependency`, `HTTPX dependency`, `python-dotenv dependency` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 262 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `lucide-react` connect `App.jsx` to `session.test.js`, `frontend/package.json`, `Evaluation.jsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Shell()` (e.g. with `closeOnEscape()` and `closeOnOutside()`) actually correct?**
  _`Shell()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Graphify workflow instructions`, `Commit message instructions`, `FastAPI dependency` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `engine.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0539906103286385 - nodes in this community are weakly interconnected._
- **Why does `react` connect `App.jsx` to `session.test.js`, `frontend/package.json`, `reset`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `cal.DESIGN.md` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `test_ai_pipeline.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05407111298127498 - nodes in this community are weakly interconnected._