# Localização visual de radiografias

**Versão:** 1.1 · **Status:** experimental · **Data:** 2026-10-18

## Finalidade e limites

Esta funcionalidade de pesquisa exibe regiões aproximadas de relevância do classificador TorchXRayVision DenseNet121 com pesos NIH. Destina-se à inspeção técnica do comportamento do modelo. Não é uma detecção de lesão validada, não confirma patologia e não deve orientar diagnóstico, tratamento, triagem ou decisões clínicas ao vivo. Toda saída exige revisão humana qualificada.

## Técnica

O backend calcula Grad-CAM no bloco convolucional `features.denseblock4`, usando o gradiente do escore de saída de cada uma das 14 classes em relação às ativações desse bloco. O CAM é redimensionado para 224 × 224 e normalizado. Para não descartar a classe de maior escore quando ela fica logo abaixo do corte de classificação, classes com saída de modelo igual ou superior a 0,25 podem ser candidatas à localização. Esse valor é um corte técnico exploratório, não uma probabilidade clínica nem uma afirmação de patologia. Mapas com suporte inferior a 0,2%, superior a 35%, sem valores úteis ou com centro na borda são omitidos. Esses filtros reduzem alguns mapas obviamente pouco informativos, mas não validam a anatomia nem removem artefatos com garantia.

O único método implementado é `gradcam`. As 14 classes do modelo são elegíveis para cálculo: Atelectasis, Cardiomegaly, Effusion, Infiltration, Mass, Nodule, Pneumonia, Pneumothorax, Consolidation, Edema, Emphysema, Fibrosis, Pleural_Thickening e Hernia. Uma classe só aparece em `markers` quando supera o corte técnico de localização e o mapa passa pelos filtros; portanto, localização pode estar indisponível mesmo quando há scores. O escore no marcador é a saída do modelo usada pelo Brightline, não uma probabilidade clínica calibrada. O corte de 0,5 usado na comparação textual/classificação exploratória é independente do corte técnico do Grad-CAM.

## Coordenadas e heatmap

O pré-processamento converte para escala de cinza, normaliza com TorchXRayVision, aplica center crop e redimensiona para 224 × 224. A geometria do recorte é preservada e usada para converter o centro de suporte do CAM ao quadro da imagem original. `x` e `y` são normalizados entre 0 e 1 em relação à largura e altura originais. O marcador é o centro do suporte do mapa acima de 60% do máximo, uma referência de relevância estimada; não é o pixel máximo nem uma coordenada exata de doença. Se esse centro cai na borda preta não exposta da radiografia, o marcador não é emitido e o frontend também o omite ao ler os pixels da imagem já salva.

O heatmap PNG com transparência mantém a proporção e posição do recorte sobre o quadro original, com lado maior limitado a 1024 pixels. A imagem original não é alterada; o frontend compõe o heatmap e os marcadores em camadas independentes.

## API e persistência

As rotas existentes de classificação incluem `markers`, `heatmap`, `localization_method`, `localization_status` e `localization_note` na resposta. Cada marcador segue este formato:

```json
{
  "pathology": "Atelectasis",
  "score": 0.82,
  "localization_method": "gradcam",
  "x": 0.42,
  "y": 0.68,
  "localization_status": "estimated",
  "heatmap_available": true
}
```

Para o catálogo NIH, esses campos são gravados no JSON da tabela existente `dataset_image_analyses` e retornados por `GET /dataset/images/{filename}/analysis`, com o mesmo controle de sessão, conta e instituição da análise. Não foi criada tabela nem rota de localização separada. `POST /radiographs/classify` e `POST /reports/analyze` também retornam localização; seus comportamentos de persistência seguem os contratos existentes.

Em exames vinculados a laudos, o botão **Reclassificar** chama `POST /reports/{report_id}/reclassify`. O backend recupera os bytes pelo vínculo `report_files` do laudo. Sem `view_all_reports`, o vínculo precisa ser da conta e da instituição ativas. Com `view_all_reports`, a busca usa o proprietário e a instituição gravados no laudo, e a análise é salva nesse mesmo registro. Em seguida executa a inferência e atualiza o JSON existente de `report_analyses`. A tela carrega `GET /reports/{report_id}/analysis` ao abrir o caso e mantém a análise anterior visível se uma nova tentativa falhar. Um processo CPU reutilizável executa a inferência fora do servidor HTTP, com limite padrão de 60 s para classificar e 20 s para localizar. Os scores chegam ao servidor antes do Grad-CAM: se a localização falhar ou exceder seu limite, o processo é encerrado quando necessário e a classificação continua disponível, sem marcadores inventados. Pedidos concorrentes recebem `409`. O frontend encerra o loading em sucesso, erro ou timeout e cancela sua espera ao mudar de caso. Consulte `DATABASE_API.md` para configuração e semântica do cancelamento.

O frontend mantém um único mapa estável de cores em `frontend/src/lib/pathologyColors.js`. O ponto na lista de scores, o marcador na prévia e o pin no visualizador ampliado consultam essa mesma cor. Só patologias com um marcador Grad-CAM válido recebem ponto colorido. Passar o foco pela lista ou pelo pin destaca a mesma classe; selecionar uma classe com pin abre o visualizador e centraliza essa coordenada. Os pins usam `x` e `y` normalizados no quadro original; a prévia e a imagem ampliada preservam a proporção da imagem e mantêm os overlays dentro do plano da imagem durante zoom e redimensionamento. Quando não há marcador confiável, a interface explica essa ausência sem descartar os escores de classificação.

A lista reutilizável de scores aplica-se ao detalhe do laudo, à classificação de imagem enviada e ao catálogo NIH. Em cada uma dessas telas, um marcador é exibido apenas se sua patologia, score, coordenadas e metadata Grad-CAM forem válidas. Foco, hover e seleção são sincronizados entre linhas e pins. A reclassificação limpa seleção e análise anterior enquanto a nova resposta é solicitada; se a chamada falhar, não há pins antigos apresentados como resultado novo.

## Validação

Execute `python -m unittest discover -s backend/tests -p "test_report_analysis.py"` e `python -m unittest discover -s backend/tests -p "test_classifier_torchxrayvision.py"` a partir da raiz. O teste com pesos reais requer TorchXRayVision e os pesos configurados disponíveis localmente; caso contrário, será ignorado. Para avaliar a qualidade espacial, use um conjunto de pesquisa com caixas ou máscaras de referência e métricas de localização predefinidas. Métricas de classificação não validam Grad-CAM. Verifique também alinhamento do recorte na imagem original, falsos focos em textos/dispositivos, classes sem mapa e comportamento em imagens de diferentes proporções.

Não há validação espacial de referência nem validação externa documentada para esta implementação. Revisão por especialistas em radiologia, metodologia, fatores humanos e governança continua necessária antes de qualquer uso além de pesquisa. **Not for patient care or live clinical use.**
