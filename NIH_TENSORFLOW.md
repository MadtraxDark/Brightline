# TensorFlow com NIH ChestX-ray14

O conjunto NIH ChestX-ray14 já foi importado para o PostgreSQL local. Para treinamento, mantenha os arquivos de metadados e divisão abaixo; os PNGs são lidos do banco e não precisam estar no workspace:

```text
data/nih-chestxray14/
├── Data_Entry_2017_v2020.csv
├── train_val_list.txt
├── test_list.txt
└── sample_manifest.json
```

Para uma nova instalação, inicie o PostgreSQL/API e aplique as migrações. Para recarregar as imagens, baixe novamente o conjunto (aprox. 557 MB) antes da importação:

```powershell
docker compose up --build -d
docker compose exec api python -m backend.migrate
docker compose run --rm -v "${PWD}/data/nih-chestxray14:/data/nih:ro" api python -m backend.import_nih_images --data-dir /data/nih
```

O importador valida todos os arquivos antes de começar e grava em lotes. Os PNGs são armazenados em `dataset_images` no volume PostgreSQL. Para executar uma nova carga, baixe novamente os PNGs para `data/nih-chestxray14/images` antes de chamar o importador.

Treine consultando as imagens já importadas no banco:

```powershell
docker compose -f docker-compose.yml -f docker-compose.tensorflow.yml run --build --rm tensorflow-train
```

O treino usa EfficientNetB0 com pesos ImageNet e classifica as 14 condições em múltiplos rótulos. Com `DATABASE_URL`, as imagens são lidas do PostgreSQL; sem essa variável, o treinador usa os arquivos locais. Os pacientes do teste oficial são removidos do treino; 10% dos pacientes restantes formam a validação. O checkpoint, modelo final, métricas do teste e histórico ficam em `artifacts/nih-chestxray14/`.

Por padrão são 3 épocas, batch 16 e imagens 224×224. Ajuste com variáveis PowerShell antes de iniciar, por exemplo `$env:NIH_EPOCHS=5`. A imagem disponível neste computador expõe apenas CPU, então o treino completo pode demorar bastante. O primeiro treino precisa de rede para buscar os pesos ImageNet. Resultados são para pesquisa/benchmark e não devem orientar diagnóstico clínico.
