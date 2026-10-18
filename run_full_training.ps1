param([int]$epochs=3, [int]$batch=32, [double]$lr=1e-4)

$py = "D:\venvs\txv-gpu\Scripts\python.exe"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "INICIANDO PIPELINE DE TREINAMENTO TORCHXRAYVISION (GPU)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Baseline
Write-Host "`n[1/3] Calculando Baseline (Modelo Original)..." -ForegroundColor Yellow
& $py ml/experiment.py baseline
if ($LASTEXITCODE -ne 0) { Write-Error "Falha no baseline"; exit 1 }

# 2. Treino
Write-Host "`n[2/3] Executando Fine-Tuning com Balanceamento de Classes..." -ForegroundColor Yellow
& $py ml/experiment.py train --epochs $epochs --batch $batch --lr $lr --max-pos-weight 10.0 --rare-boost 4.0
if ($LASTEXITCODE -ne 0) { Write-Error "Falha no treino"; exit 1 }

# 3. Relatório e Calibração
Write-Host "`n[3/3] Calibrando Probabilidades e Gerando Relatório de Comparação..." -ForegroundColor Yellow
& $py ml/experiment.py report --target-sensitivity 0.90
if ($LASTEXITCODE -ne 0) { Write-Error "Falha no relatório"; exit 1 }

Write-Host "`nPipeline concluído com sucesso!" -ForegroundColor Green
