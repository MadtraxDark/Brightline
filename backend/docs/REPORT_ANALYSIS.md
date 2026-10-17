# Análise de laudos

## Classificação de imagem independente

`POST /radiographs/classify` exige `Authorization: Bearer <access_token>` e recebe `multipart/form-data` com o campo obrigatório `radiograph` (PNG/JPEG, até 10 MB). A rota usa o mesmo modelo NIH carregado pelo serviço e retorna as 14 probabilidades, classes acima do corte exploratório, versão do modelo e limitações. A imagem é processada em memória e não é persistida por essa rota.

```bash
curl -X POST http://localhost:8080/radiographs/classify \
  -H "Authorization: Bearer $TOKEN" \
  -F 'radiograph=@chest.png;type=image/png'
```

O frontend oferece essa operação em `/classificar`; defina `VITE_BRIGHTLINE_API_URL` se a API não estiver em `http://localhost:8080`. A conta deve existir na API local. O modelo classifica apenas radiografias de tórax e serve para pesquisa; as pontuações não são diagnósticos nem decisões clínicas.

`POST /reports/analyze` exige `Authorization: Bearer <access_token>` e recebe `multipart/form-data`:

- `report_text`: texto do laudo, opcional quando `report_file` foi enviado; máximo 100.000 caracteres.
- `report_file`: PDF pesquisável do laudo, opcional quando `report_text` foi enviado; máximo 10 MB. PDF digitalizado sem camada textual não tem OCR habilitado.
- `radiograph`: radiografia torácica PNG ou JPEG, opcional. Não envie TC, RM ou outra modalidade: o modelo foi treinado apenas com radiografias NIH ChestX-ray14.
- `report_id`: identificador opcional para atualização/reanálise do laudo.

## Requisição

```bash
curl -X POST http://localhost:8080/reports/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F 'report_text=Opacidade focal no lobo inferior direito, podendo representar consolidação.' \
  -F 'radiograph=@chest.png;type=image/png'
```

Também é possível enviar somente texto, texto mais PDF, ou PDF sem `report_text`.

## Resposta

Exemplo ilustrativo; o serviço retorna todas as 14 probabilidades:

```json
{
  "report_id": "f1c9...",
  "findings": [{"finding": "consolidação no lobo inferior direito", "evidence": "Opacidade focal no lobo inferior direito, podendo representar consolidação.", "urgency": "actionable", "deadline_hours": 720, "confidence": "medium"}],
  "predictions": ["Consolidation"],
  "probabilities": {"Atelectasis": 0.08, "Cardiomegaly": 0.06, "Effusion": 0.12, "Infiltration": 0.24, "Mass": 0.02, "Nodule": 0.04, "Pneumonia": 0.38, "Pneumothorax": 0.03, "Consolidation": 0.61, "Edema": 0.09, "Emphysema": 0.01, "Fibrosis": 0.02, "Pleural_Thickening": 0.04, "Hernia": 0.01},
  "comparison": {"threshold": 0.5, "threshold_status": "exploratory_unvalidated", "text_classes": ["Consolidation"], "model_classes_above_threshold": ["Consolidation"], "disagreements": [], "limitations": ["Classes are lexical equivalents only; no validated clinical ontology is used."]},
  "disagreements": [],
  "model_version": "nih-chestxray14-efficientnetb0-v1",
  "metrics": {"loss": 0.3916, "macro_auc": 0.6130},
  "status": "review_required",
  "human_review_required": true
}
```

`predictions` lista as classes acima do corte exploratório 0,5; `probabilities` contém sempre as 14 classes. `disagreements` pode conter `text_not_signaled` ou `model_without_text_match`. O corte não foi validado nem calibrado: o `metrics.json` disponível informa 295 imagens de teste e macro AUC 0,613, mas não limiares nem métricas por classe. Nenhum valor representa diagnóstico.

## Extração, privacidade e fila

A extracao reutiliza o prompt e o validador existentes em `backend/prompts/extraction.txt` e `backend/extract.py`, usando `generateContent` da Gemini Developer API. Configure `GEMINI_API_KEY`; `GEMINI_MODEL` e opcional e usa `gemini-3.5-flash-lite` por padrao. A API oficial exige a chave no cabecalho `x-goog-api-key` ([referencia](https://ai.google.dev/api/generate-content)). O Google lista atualmente esse modelo no nivel gratuito, sujeito a limites e disponibilidade que podem mudar. O Google informa que pode usar dados enviados no nivel gratuito para melhorar seus produtos. Nao envie laudos identificaveis ou dados sensiveis sem autorizacao e avaliacao de privacidade adequadas ([precos e uso dos dados](https://ai.google.dev/gemini-api/docs/pricing)). Sem `GEMINI_API_KEY`, a API responde 503 sem persistir a analise.

Resultados são isolados pelo usuário autenticado e persistidos em `reports`, `extractions` e `report_analyses`; achados textuais também entram em `cases`/`events` com status `notified` na fila simulada já existente, podendo ser reconhecidos e acompanhados pela API atual. A análise visual não cria nem escalona casos por conta própria. Os arquivos enviados são armazenados em `files` e vinculados em `report_files`, sob `owner_id`. Reanalisar o mesmo `report_id` atualiza laudo e análise, e mantém os casos já existentes.

Reinicie/aplique a migração após atualizar o backend:

```powershell
docker compose up --build -d
docker compose exec api python -m backend.migrate
```
