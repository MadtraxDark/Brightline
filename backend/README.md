# Brightline — backend

API com FastAPI e SQLite. O banco inicia vazio e não inclui laudos, casos ou dados de demonstração. Nenhuma mensagem é enviada.

## Rodar

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Na inicialização, o backend cria `brightline.db` e as tabelas vazias.

Abra `http://localhost:8000/health` ou `http://localhost:8000/docs` para confirmar que a API iniciou. Os modelos de entrada já estão definidos; endpoints de carga e casos serão acrescentados nas próximas etapas.
