# Revisão dos laudos sintéticos Brightline

O arquivo reports.json contém 40 laudos fictícios em português para testar extração de texto. Os gabaritos expressam a intenção de cada cenário e precisam de revisão humana antes de fechar a avaliação. Nenhum exame de imagem real está associado aos textos. Os nomes dos profissionais são personagens fictícios e eventuais coincidências são fortuitas.

## Composição

- R-001 a R-008: oito laudos com achado crítico.
- R-009 a R-016: oito laudos com achado urgente.
- R-017 a R-024: oito laudos com achado acionável.
- R-025 a R-032: oito controles sem achado que gere alerta no contrato.
- R-033 a R-040: oito cenários adicionais de dificuldade.

Total de achados no gabarito: 34. Por classe: critical=11, urgent=11, actionable=12. Laudos críticos ou urgentes não sinalizados: 15.

## Cobertura dos casos difíceis

| Requisito | Laudos |
|---|---|
| Negação | R-025, R-026, R-029, R-030, R-032 |
| Achado conhecido e estável | R-027, R-031; também R-039 junto de achado novo |
| Achado equívoco | R-036, R-037, R-038 |
| Crítico descrito, mas omitido na conclusão | R-033 |
| Laudo normal | R-026, R-028, R-030 |
| Múltiplos achados com urgências diferentes | R-034, R-040 |
| Negação ao lado de achado positivo | R-035; também R-039 |

R-033 contém uma conclusão intencionalmente incompleta para testar a segunda leitura do corpo do laudo. Não é um erro de montagem.

Nos casos R-036 a R-038, o gabarito contém a suspeita expressa, sem afirmar que a doença foi confirmada. A extração deve preservar essa incerteza e usar confiança baixa ou média. A confiança pertence à extração e não foi acrescentada ao contrato de reports.json.

As classes de urgência são rótulos para a demonstração. Os prazos de 1, 24 e 720 horas são parâmetros do protótipo, não recomendações de conduta. Não foram incluídos campos adicionais ao contrato. Não há saídas simuladas de LLM ou métricas apresentadas como resultados reais.

## Semelhanças para revisar com Bruno

- R-001, R-007 e R-040 repetem pneumotórax hipertensivo, variando modalidade, lado e presença de segundo achado.
- R-002, R-033 e R-038 repetem hemorragia intraparenquimatosa, variando localização, omissão na conclusão e incerteza.
- R-009 e R-034 repetem apendicite, com lesão renal adicional no segundo.
- R-010 e R-035 repetem diverticulite com abscesso, com negação explícita de apendicite no segundo.
- R-017, R-023, R-037 e R-039 variam apresentações de nódulo pulmonar.

Esses pares são contrastes deliberados para testar o comportamento da extração. Para avaliar capacidade de generalização, reservar uma avaliação independente e manter variantes do mesmo cenário no mesmo grupo; não usar o conjunto ajustado repetidamente como prova de desempenho clínico.

## Referências consultadas

As fontes são referências didáticas. Os textos foram criados para o protótipo, não são transcrições nem traduções dos casos publicados. Não foi atribuída imagem de paciente real a um laudo fictício.

- Pneumotórax hipertensivo, Eurorad: https://eurorad.org/case/1373
- Dissecção de aorta, Eurorad: https://www.eurorad.org/case/9309
- Apendicite, Eurorad: https://eurorad.org/case/5662
- Apendicite perfurada, Eurorad: https://www.eurorad.org/case/8396
- Adenoma adrenal incidental, Eurorad: https://www.eurorad.org/case/7222
- Apendicite aguda, Radiologia Brasileira: https://rb.org.br/details/1156/pt-BR

## Inventário para revisão do gabarito

| ID | Modalidade | Foco do teste | Gabarito |
|---|---|---|---|
| R-001 | Radiografia de tórax | crítico explícito | pneumotórax hipertensivo à direita (critical) |
| R-002 | TC de crânio | crítico com negação adjacente | hemorragia intraparenquimatosa aguda à esquerda (critical) |
| R-003 | Angio-TC de aorta | dissecção sem ruptura descrita | dissecção aguda da aorta Stanford A (critical) |
| R-004 | Angio-TC de tórax | crítico por cenário de TEP com sobrecarga | tromboembolismo pulmonar central extenso com sinais de sobrecarga ventricular direita (critical) |
| R-005 | TC de crânio | hemorragia com complicação | hemorragia subaracnóidea aguda com hidrocefalia (critical) |
| R-006 | TC de abdome | sangramento ativo | ruptura de aneurisma da aorta abdominal com sangramento ativo (critical) |
| R-007 | TC de tórax | variação de modalidade e lateralidade | pneumotórax hipertensivo à esquerda (critical) |
| R-008 | TC de crânio | hemorragia extra-axial | hematoma subdural agudo à direita com efeito de massa (critical) |
| R-009 | TC de abdome | urgente com complicações negadas | apendicite aguda (urgent) |
| R-010 | TC de abdome | diverticulite complicada | diverticulite aguda do sigmoide complicada por abscesso (urgent) |
| R-011 | TC de coluna cervical | fratura instável conforme classes da demo | fratura-luxação instável de C6-C7 (urgent) |
| R-012 | Ultrassom de abdome | ultrassom com achado positivo | colecistite aguda calculosa (urgent) |
| R-013 | TC de abdome | obstrução urinária | ureterolitíase obstrutiva à esquerda com hidroureteronefrose (urgent) |
| R-014 | TC de abdome | obstrução com isquemia negada | obstrução mecânica do intestino delgado (urgent) |
| R-015 | RM de coluna lombar | RM com fratura instável | fratura instável de L1 com lesão ligamentar posterior (urgent) |
| R-016 | TC de abdome | infecção complicada | pielonefrite direita complicada por abscesso renal (urgent) |
| R-017 | TC de tórax | nódulo novo sem comparação | nódulo pulmonar suspeito no lobo superior direito (actionable) |
| R-018 | TC de abdome | massa indeterminada sem presumir adenoma | massa adrenal esquerda indeterminada (actionable) |
| R-019 | Ultrassom de tireoide | ultrassom com achado incidental | nódulo tireoidiano suspeito à direita (actionable) |
| R-020 | RM de abdome | lesão complexa | lesão cística renal esquerda suspeita (actionable) |
| R-021 | TC de abdome | achado incidental suspeito | lesão cística pancreática com nódulo mural (actionable) |
| R-022 | Ultrassom de pelve | massa anexial | massa anexial esquerda suspeita (actionable) |
| R-023 | TC de tórax | subtipo distinto de nódulo pulmonar | nódulo pulmonar parcialmente sólido no lobo inferior esquerdo (actionable) |
| R-024 | Ultrassom de abdome | lesão para caracterização | lesão focal hepática indeterminada (actionable) |
| R-025 | TC de crânio | negação de hemorragia | lista vazia |
| R-026 | Radiografia de tórax | normal e pneumotórax negado | lista vazia |
| R-027 | TC de tórax | nódulo conhecido e estável | lista vazia |
| R-028 | Ultrassom de abdome | ultrassom normal | lista vazia |
| R-029 | TC de abdome | múltiplos achados negados | lista vazia |
| R-030 | RM de crânio | RM normal | lista vazia |
| R-031 | TC de abdome | adrenal benigna conhecida e estável | lista vazia |
| R-032 | TC de tórax | negação com termo afastado | lista vazia |
| R-033 | TC de crânio | crítico omitido na conclusão de propósito | hemorragia intraparenquimatosa aguda frontal direita (critical) |
| R-034 | TC de abdome | múltiplos achados com urgências diferentes | apendicite aguda (urgent); lesão renal sólida suspeita à direita (actionable) |
| R-035 | TC de abdome | negação grave ao lado de achado real | diverticulite aguda do sigmoide complicada por abscesso (urgent) |
| R-036 | Angio-TC de tórax | equívoco incluir com confiança baixa ou média | suspeita de embolia pulmonar lobar à direita (urgent) |
| R-037 | TC de tórax | equívoco incidental para revisão humana | possível nódulo pulmonar suspeito à esquerda (actionable) |
| R-038 | TC de crânio | equívoco crítico para revisão humana | possível hemorragia cerebelar aguda à esquerda (critical) |
| R-039 | TC de tórax | achado estável junto de novo achado | novo nódulo pulmonar suspeito à esquerda (actionable) |
| R-040 | TC de tórax | crítico e incidental no mesmo laudo | pneumotórax hipertensivo à direita (critical); nódulo pulmonar suspeito à esquerda (actionable) |
