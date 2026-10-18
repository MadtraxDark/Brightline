# Auditoria técnica da classificação — 17/10/2026

## Resultado

Atualização: a classificação usa o TorchXRayVision (DenseNet121, pesos pré-treinados `densenet121-res224-nih`). O texto abaixo descreve o fluxo atual; os resultados numéricos da auditoria original referiam-se ao modelo anterior e foram removidos. Não foi reproduzido um retorno fixo de Infiltration.

## Fluxo verificado

1. `RadiographClassifier.jsx` envia o arquivo selecionado em multipart no campo `radiograph` para `/radiographs/classify`.
2. A API valida MIME e tamanho, e encaminha os bytes para `report_analysis.infer` em uma thread.
3. Pillow verifica o formato PNG/JPEG e o limite de resolução e converte a imagem para tons de cinza; `xrv.datasets.normalize` escala 0–255 para [−1024, 1024], seguido de `XRayCenterCrop` e `XRayResizer(224)`, produzindo um tensor `(1, 1, 224, 224)`.
4. `xrv.models.DenseNet(weights="densenet121-res224-nih")` carrega o modelo. Ele é reutilizado em memória; cada upload passa novamente pelo modelo. O cache é dos pesos, não das previsões.
5. A saída tem probabilidades sigmoid independentes por patologia; a API as seleciona por nome e as devolve na ordem de `LABELS`. Elas não devem ser normalizadas por softmax nem somar 100%: o problema é multirrótulo.
6. A API seleciona todas as classes com pontuação ≥0,5. Não força argmax nem Infiltration. A interface mostra as 14 probabilidades. A comparação com laudos é lexical, usa o mesmo corte e explicita negação, incerteza e lateralidade; não compara pixels com imagens de referência nem constitui interpretação clínica validada.

## Evidência reproduzível

Testes com imagens sintéticas (gradiente e inverso) verificam sensibilidade aos pixels e execução real do modelo; não avaliam acurácia em radiografias nem a capacidade de rejeitar imagens fora do domínio. O modelo aceita qualquer PNG/JPEG válido: não existe detector de radiografia de tórax. Não há métricas de desempenho próprias neste projeto; a AUC publicada pelo TorchXRayVision não comprova confiabilidade clínica aqui.

## Melhorias implementadas

- Validação das classes exigidas por nome e pré-processamento compatível com o TorchXRayVision.
- Rejeição de saídas com formato incorreto, NaN, infinito ou valores fora de [0,1]. Falhas não geram uma classificação substituta.
- Respostas identificam engine, versões do TorchXRayVision e do PyTorch, pesos, classes e pré-processamento; a interface exibe a identificação dos pesos e as classes acima do corte.
- Seleção de arquivo bloqueada durante a requisição para impedir associação do resultado anterior à prévia de outro arquivo.
- Teste HTTP com os pesos reais compara resultados com inferência direta e exige respostas diferentes para pixels diferentes. Testes adicionais rejeitam uploads vazios/corrompidos e saídas inválidas.

## Validação e limites

`python -m unittest discover -s backend/tests -v`, com `PYTHONPATH=backend`: 22 testes aprovados. `npm.cmd run build` no frontend: aprovado. `python -m graphify update .`: concluído.

Os testes HTTP locais de integração não iniciam o banco; o teste separado no container confirmou a execução da API ativa. Não houve reconstrução ou implantação dos containers: as melhorias estão no código do workspace e no build local. Reinicie/reconstrua o serviço para carregar essas alterações e, ao trocar pesos, reinicie a API para invalidar o modelo em memória.

A causa do relato de “sempre Infiltração” permanece não reproduzida com os controles utilizados. Para atribuí-la a viés dos pesos, amostras específicas, outra interface ou outra instância, é necessário reproduzir as mesmas entradas e observar a resposta de rede correspondente. Não se deve alterar os escores para forçar diversidade. A ferramenta permanece experimental e exige revisão humana, sem uso para diagnóstico, tratamento ou triagem.
