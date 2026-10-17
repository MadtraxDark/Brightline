# Brightline — API

API FastAPI com SQLite e relógio simulado. O banco `brightline.db` é criado na primeira inicialização. O backend não cria nem carrega dados de demonstração automaticamente; os arquivos `reports.json` e `extractions_cache.json` serão fornecidos pela equipe.

## Rodar

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

A API fica em `http://localhost:8000` e a documentação interativa em `http://localhost:8000/docs`. O banco começa vazio até os arquivos de dados serem importados.

Quando os arquivos de dados forem disponibilizados, coloque `reports.json` e `extractions_cache.json` em `data/` ou defina `BRIGHTLINE_DATA_DIR` antes de iniciar o servidor. `BRIGHTLINE_DB_PATH` permite escolher o caminho do SQLite. `POST /simulate/reset` importa esses arquivos e reinicia a demonstração.
