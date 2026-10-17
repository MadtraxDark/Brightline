# Graph Report - Brightline  (2026-10-17)

## Corpus Check
- 100 files · ~86,522 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .css 4, (none) 3, .keras 2)

## Summary
- 611 nodes · 1230 edges · 37 communities (21 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8360dbec`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- engine.test.js
- cal.DESIGN.md
- LandingPage.jsx
- test_ai_pipeline.py
- Extração e avaliação do Brightline
- check-data.js
- main.py
- CaseDetail.jsx
- download_nih_sample.py
- App.jsx
- Graphify project instructions
- Commit conventions
- ref_node_assert
- Evaluation.jsx
- scripts
- dev.mjs
- Brightline — sistema visual
- dashboardApi.js
- Revisão dos laudos sintéticos Brightline
- NavigationHighlight
- frontend/package.json
- scripts/evaluate.js
- Brightline: regras de design
- design-tools.md
- PRODUCT.md
- NIH_TENSORFLOW.md
- LANDING.md
- lib/evaluate.js

## God Nodes (most connected - your core abstractions)
1. `db()` - 22 edges
2. `DashboardShell()` - 21 edges
3. `react` - 18 edges
4. `CaseDetail()` - 18 edges
5. `scripts` - 15 edges
6. `createStore()` - 15 edges
7. `PipelineTests` - 14 edges
8. `lucide-react` - 14 edges
9. `selectCases()` - 13 edges
10. `read_json()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `confirmRead()` --calls--> `acknowledge()`  [EXTRACTED]
  frontend/src/dashboardApi.js → frontend/src/api.js
- `submitAction()` --indirect_call--> `closeCase()`  [INFERRED]
  frontend/src/components/CaseDetail.jsx → frontend/src/dashboardApi.js
- `FastAPI backend` --conceptually_related_to--> `FastAPI dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt
- `FastAPI backend` --conceptually_related_to--> `HTTPX dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt
- `FastAPI backend` --conceptually_related_to--> `python-dotenv dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt

## Import Cycles
- None detected.

## Communities (37 total, 16 thin omitted)

### Community 0 - "engine.test.js"
Cohesion: 0.08
Nodes (26): acknowledge(), advance(), clone(), loadCases(), OPEN_FOR_ESCALATION, registerAction(), replaceCase(), requireCase() (+18 more)

### Community 1 - "cal.DESIGN.md"
Cohesion: 0.05
Nodes (38): Border Radius Scale, Brand & Accent, Breakpoints, Buttons, Cards & Containers, Collapsing Strategy, Colors, Components (+30 more)

### Community 2 - "LandingPage.jsx"
Cohesion: 0.13
Nodes (15): benefits, BenefitsCarousel(), FaqItem(), LandingHeader(), links, LandingPage(), previewState, ProductPreview() (+7 more)

### Community 3 - "test_ai_pipeline.py"
Cohesion: 0.10
Nodes (18): load_reports(), read_json(), validate_extraction(), write_json(), evaluate(), identity(), load_aliases(), main() (+10 more)

### Community 4 - "Extração e avaliação do Brightline"
Cohesion: 0.10
Nodes (18): API Brightline, Executar, Persistência, Arquivos, Executar no PowerShell, Extração e avaliação do Brightline, Importar no PostgreSQL local, Interpretar a avaliação (+10 more)

### Community 5 - "check-data.js"
Cohesion: 0.09
Nodes (19): byId, byUrgency, cache, checkList(), confidences, dataDir, deadlines, doctors (+11 more)

### Community 6 - "main.py"
Cohesion: 0.06
Nodes (42): acknowledge(), action(), advance(), authenticated(), case_detail(), cases(), clock(), command() (+34 more)

### Community 7 - "CaseDetail.jsx"
Cohesion: 0.06
Nodes (58): acknowledge(), advance(), getCase(), getStats(), listCases(), listMissed(), registerAction(), reset() (+50 more)

### Community 8 - "download_nih_sample.py"
Cohesion: 0.08
Nodes (14): get_settings(), Settings, lifespan(), main(), main(), fetch(), main(), stable_patient_split() (+6 more)

### Community 9 - "App.jsx"
Cohesion: 0.22
Nodes (14): App(), RequireAuth(), Login(), onSubmit(), Register(), PROFILE_KEY, isAuthenticated(), login() (+6 more)

### Community 13 - "ref_node_assert"
Cohesion: 0.23
Nodes (3): cases, splitEvidence(), joined()

### Community 14 - "Evaluation.jsx"
Cohesion: 0.16
Nodes (13): cards, Evaluation(), FindingList(), precisionOverall, recallCritical, recallOverall, swapped, swappedKey() (+5 more)

### Community 15 - "scripts"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, dev, dev:backend, dev:frontend, install:frontend (+2 more)

### Community 16 - "dev.mjs"
Cohesion: 0.13
Nodes (11): STORAGE_KEY, fakeTimers(), fixtureData, fixtureDir, openStore(), children, localPython, root (+3 more)

### Community 17 - "Brightline — sistema visual"
Cohesion: 0.13
Nodes (13): Referência visual, Barras de rolagem, Brightline — sistema visual, Cadastro, Continuidade da navegação, Direção aprovada, Hierarquia, Identidade (+5 more)

### Community 18 - "dashboardApi.js"
Cohesion: 0.32
Nodes (7): closeCase(), confirmRead(), dashboardCase(), getCase(), getStats(), NETWORK_ERROR, registerAction()

### Community 19 - "Revisão dos laudos sintéticos Brightline"
Cohesion: 0.29
Nodes (6): Cobertura dos casos difíceis, Composição, Inventário para revisão do gabarito, Referências consultadas, Revisão dos laudos sintéticos Brightline, Semelhanças para revisar com Bruno

### Community 20 - "NavigationHighlight"
Cohesion: 0.60
Nodes (5): NavigationHighlight(), move(), snap(), stop(), transition()

### Community 21 - "frontend/package.json"
Cohesion: 0.04
Nodes (37): dependencies, @fontsource/atkinson-hyperlegible-next, @fontsource/source-serif-4, gsap, lenis, lucide-react, react, react-dom (+29 more)

### Community 22 - "scripts/evaluate.js"
Cohesion: 0.18
Nodes (8): cache, computed, current, dataDir, found, next, reports, write

### Community 30 - "lib/evaluate.js"
Cohesion: 0.60
Nodes (5): byReportId(), computeEvaluation(), listItem(), normalizeName(), sameFinding()

## Knowledge Gaps
- **7 isolated node(s):** `Graphify workflow instructions`, `Commit message instructions`, `FastAPI dependency`, `HTTPX dependency`, `python-dotenv dependency` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 263 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `lucide-react` connect `CaseDetail.jsx` to `App.jsx`, `LandingPage.jsx`, `frontend/package.json`, `Evaluation.jsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `DashboardShell()` (e.g. with `closeOnEscape()` and `closeOnOutside()`) actually correct?**
  _`DashboardShell()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Graphify workflow instructions`, `Commit message instructions`, `FastAPI dependency` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `engine.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08461538461538462 - nodes in this community are weakly interconnected._
- **Why does `react` connect `CaseDetail.jsx` to `App.jsx`, `LandingPage.jsx`, `frontend/package.json`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `cal.DESIGN.md` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `LandingPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12666666666666668 - nodes in this community are weakly interconnected._