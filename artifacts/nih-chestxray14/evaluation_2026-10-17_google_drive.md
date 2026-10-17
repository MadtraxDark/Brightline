# Avaliação do EfficientNetB0 NIH ChestX-ray14

**Conjunto reservado:** 7 imagens de 7 pacientes; corte fixo 0,50; modelo `nih-chestxray14-efficientnetb0-v1`.

## Métricas no subconjunto oficial de teste

- Precisão micro: indefinida (nenhuma previsão positiva no corte de 0,5)
- Sensibilidade micro: 0,0%
- AUROC macro: 0,758 em 8 classes com positivos e negativos
- Falsos negativos: 13 de 13 rótulos positivos

| Classe | Positivos | Precisão | Sensibilidade | FN | AUROC |
|---|---:|---:|---:|---:|---:|
| Atelectasis | 0 | — | — | 0 | — |
| Cardiomegaly | 0 | — | — | 0 | — |
| Consolidation | 0 | — | — | 0 | — |
| Edema | 0 | — | — | 0 | — |
| Effusion | 1 | — | 0,000 | 1 | 1,000 |
| Emphysema | 2 | — | 0,000 | 2 | 0,600 |
| Fibrosis | 2 | — | 0,000 | 2 | 0,900 |
| Hernia | 0 | — | — | 0 | — |
| Infiltration | 2 | — | 0,000 | 2 | 0,500 |
| Mass | 2 | — | 0,000 | 2 | 0,600 |
| Nodule | 1 | — | 0,000 | 1 | 0,667 |
| Pleural_Thickening | 2 | — | 0,000 | 2 | 0,800 |
| Pneumonia | 0 | — | — | 0 | — |
| Pneumothorax | 1 | — | 0,000 | 1 | 1,000 |

## Casos reservados e erros

| Imagem | Rótulos de referência | Três maiores probabilidades |
|---|---|---|
| 00000013_022.png | Infiltration, Mass | Infiltration 0,214; Mass 0,192; Atelectasis 0,179 |
| 00000013_032.png | Emphysema, Mass, Pneumothorax | Infiltration 0,364; Effusion 0,222; Atelectasis 0,211 |
| 00000090_005.png | Effusion, Emphysema, Infiltration | Infiltration 0,427; Effusion 0,317; Atelectasis 0,195 |
| 00000165_004.png | Pleural_Thickening | Infiltration 0,283; Fibrosis 0,166; Mass 0,166 |
| 00000187_000.png | Pleural_Thickening | Infiltration 0,340; Nodule 0,226; Effusion 0,214 |
| 00000199_002.png | Fibrosis, Nodule | Infiltration 0,279; Fibrosis 0,263; Mass 0,223 |
| 00000218_005.png | Fibrosis | Infiltration 0,258; Effusion 0,170; Pneumonia 0,170 |

## Interpretação e limites

O manifesto tem 70 linhas e 46 imagens únicas; 24 linhas repetidas foram agregadas como rótulos multirrótulo. A conferência com os arquivos usados pelo treinamento classificou 36 imagens no treino, 3 na validação e 7 no teste. A tabela de métricas usa somente as 7 imagens de `test_list.txt`; as demais não entram nela.

As previsões foram obtidas enviando apenas as imagens à API antes de consultar os rótulos do manifesto. Os pesos não foram alterados e o corte não foi ajustado com este conjunto. Precisão é indefinida porque não houve nenhuma previsão positiva no corte fixo; todas as 13 ocorrências positivas do subconjunto foram falsos negativos. AUROC avalia o ranqueamento contínuo e não muda esse resultado no corte usado.

O subconjunto é pequeno e não constitui validação clínica. Ele é uma amostra exploratória do teste oficial do projeto; a sensibilidade por classe é instável com tão poucos casos.

Relatório detalhado, incluindo probabilidades por imagem: `artifacts/nih-chestxray14/evaluation_2026-10-17_google_drive.json`.
