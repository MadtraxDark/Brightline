# Depuração e testes de reclassificação

Data: 2026-10-18. Branch: `backend-localization`. Alterações sem commit.

## Causa reproduzida e investigação

A inferência normal não ficou bloqueada indefinidamente nos testes. A falha real reproduzida com PostgreSQL foi **HTTP 500 ao persistir**, depois da inferência: `InvalidColumnReference: there is no unique or exclusion constraint matching the ON CONFLICT specification`. A chave de `report_analyses` ainda era `(owner_id, report_id)`, enquanto o endpoint usa `(owner_id, institution_id, report_id)`. A migração existente `005_institutional_dataset_analyses` estava pendente; foi aplicada com `python -m backend.migrate`, sem criar tabelas paralelas nem remover registros.

Outros defeitos encontrados no fluxo permitiam esperas sem limite ou perda do resultado:

- `authorizedRequest` encerrava o timer quando os cabeçalhos chegavam, antes de aguardar `response.json()`.
- Inferência e Grad-CAM compartilhavam uma execução sem prazo no servidor; uma operação nativa bloqueada não podia ser interrompida.
- Uma exceção do Grad-CAM descartava a classificação já calculada.
- Uma resposta iniciada em outro caso podia atualizar o estado do caso atual, e a proteção contra cliques repetidos dependia apenas do estado React.
- `GET /workspace` consultava registros de outras contas e instituições. Ao corrigir o filtro, os casos legados deixaram de aparecer na conta atual porque seus vínculos eram de outra conta e da instituição `__legacy__`; a conexão com o banco estava funcionando.

O erro de persistência é comprovado; não foi possível atribuir o relato original de loading infinito a uma única etapa bloqueada anterior aos logs. Os limites novos cobrem explicitamente banco, classificação, localização, leitura da resposta e renovação da sessão.

## Correções

- `backend/app/reclassification.py`: processo CPU reutilizável, uma execução por vez, sem fila ilimitada. Scores são enviados antes da localização. Prazo padrão de 60 s para classificação/carregamento e 20 s para Grad-CAM. Timeout encerra o processo; a próxima tentativa inicia outro. Falha/timeout/encerramento da localização preserva os scores e omite os marcadores.
- `backend/app/report_analysis.py`: falha de localização deixa a classificação utilizável; logs de pré-processamento, carregamento, classificação e localização com duração e tipo da exceção, sem conteúdo da imagem ou do laudo. `torch.__version__` é convertido para string simples para evitar importar PyTorch no servidor HTTP ao desserializar metadados do worker.
- `backend/app/main.py`: worker no endpoint existente, `409` em concorrência, `504` em timeout, `503` em falha do modelo/banco; logs de recebimento, persistência e resposta. PostgreSQL: conexão 5 s, comando 10 s, espera por lock 3 s. Seleção consistente da imagem vinculada mais recente. Workspace restrito à conta/instituição ativas.
- `frontend/src/lib/session.js`: timeout permanece ativo até terminar o JSON, inclui refresh da sessão, aceita cancelamento e rejeita JSON inválido.
- `frontend/src/components/CaseDetail.jsx`: trava imediata com ref, cancelamento ao navegar, proteção contra resposta de outro caso, validação de scores e finalização em `finally`; ausência de localização é informada.
- `frontend/src/components/ExamViewer.jsx`: remove mensagem de ausência de marcações quando há pontos Grad-CAM.
- `frontend/src/styles/app.css`: seletor específico dos marcadores evita que o estilo geral dos botões do diálogo os transforme em quadrados grandes; os pontos circulares vermelhos foram conferidos visualmente no navegador.
- Testes: `test_report_analysis.py`, `test_report_endpoint.py`, `test_reclassification_worker.py`, `test_dataset_image_api.py` e `frontend/src/lib/reclassification.test.js`. Sessões de testes antigos do catálogo foram atualizadas para incluir a instituição exigida pelo contrato atual.
- Contrato atualizado em `docs/DATABASE_API.md` e `docs/RADIOGRAPH_LOCALIZATION.md`. Grafo atualizado por `python -m graphify update .`.

## Dados usados

O banco tinha 1.387 imagens NIH e nenhuma radiografia vinculada a laudo no início. Foi reutilizada a primeira imagem NIH ordenada por filename, com inferência real e pesos `densenet121-res224-nih` disponíveis localmente. Um laudo explicitamente sintético `RECLASSIFY-DEBUG-20261018`, em conta de teste separada, foi ligado à imagem pelo armazenamento existente `files`/`report_files`. A cópia dos bytes nesse armazenamento é necessária para testar o endpoint de laudos; nenhum registro de `dataset_images` foi duplicado e nenhuma estrutura nova de persistência foi criada.

A validação final HTTP e no Chrome usou PostgreSQL, autenticação real, arquivo real e modelo real, sem mocks. Mocks foram usados apenas nos testes unitários de falhas, hooks e comunicação interrompida.

## Resultados executados

| Cenário                                     | Resultado observado                                                                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inferência direta antes das correções       | 5,504 s, incluindo carga inicial; 14 scores válidos e 2 marcadores                                                                                                                                      |
| Reclassificação com schema antigo           | HTTP 500 após inferência; erro de chave de conflito reproduzido                                                                                                                                         |
| Após migração, primeira versão do worker    | HTTP 200 em 7,745 s; 14 scores e 2 marcadores; execução seguinte 0,600 s                                                                                                                                |
| Worker final, pesos normais                 | HTTP 200 em 6,067 s a frio; seguintes 0,584 s e 0,617 s; 14 scores e 2 marcadores                                                                                                                       |
| Clique real no Chrome                       | Loading observado durante a execução, encerrado depois; mensagem de conclusão e scores exibidos                                                                                                         |
| Visualizador ampliado                       | Dois botões vermelhos de localização estimada renderizados sobre a imagem; controles de pontos/heatmap disponíveis                                                                                      |
| Recarregar página                           | Scores e marcadores recuperados pela API de análise salva                                                                                                                                               |
| Dois POSTs simultâneos reais                | Um HTTP 200 em 6,067 s e um HTTP 409 em 0,119 s                                                                                                                                                         |
| Duas reclassificações consecutivas          | Ambas HTTP 200; consulta ao banco confirmou somente um registro de análise                                                                                                                              |
| Timeout real de classificação               | Limite temporário de 0,001 s; HTTP 504 em aproximadamente 0,17 s; erro exibido no Chrome e botão liberado                                                                                               |
| Modelo indisponível real                    | Pesos temporariamente configurados com nome inexistente; HTTP 503 em aproximadamente 5,36 s; Chrome exibiu erro, encerrou loading e manteve análise anterior                                            |
| Timeout real somente do Grad-CAM            | Limite temporário de 0,000001 s; classificação real terminou; processo encerrado, HTTP 200 em aproximadamente 5,59 s; scores salvos, marcadores vazios e mensagem de localização indisponível no Chrome |
| Lock real no PostgreSQL                     | Linha da análise bloqueada em outra transação; HTTP 503 em 8,531 s, incluindo inferência e lock de 3 s; análise anterior preservada                                                                     |
| Falha de Grad-CAM e processo encerrado      | Testes automatizados confirmaram preservação dos scores, sem inventar marcadores                                                                                                                        |
| JSON pendente/refresh pendente/cancelamento | Testes frontend confirmaram timeout durante leitura do corpo e refresh, cancelamento e rejeição de JSON inválido                                                                                        |

Os tempos a frio incluem importações e carga dos pesos. O worker mantém o modelo entre pedidos normais; timeout/falha encerra essa instância. Não há evidência de ganho na qualidade do modelo: pesos, pré-processamento, classes e corte exploratório foram preservados.

## Comandos e verificações

```powershell
$env:PYTHONPATH='backend'
$env:BRIGHTLINE_TEST_DATABASE='1'
python -m unittest discover -s backend/tests -q
npm.cmd test
# Compilação, a partir de frontend/:
npm.cmd exec -- vite build
python -m graphify update .
```

- Backend: 41 testes passaram, incluindo integração PostgreSQL habilitada e testes com pesos reais.
- Frontend: 140 testes passaram na suíte completa; os cinco testes novos de reclassificação e os quinze testes de sessão também foram executados diretamente após os ajustes de timeout/refresh.
- Vite: compilação de produção executada com sucesso.
- `npm.cmd run build`: **não passou** no prebuild `check:colors`, que reporta 149 ocorrências fora de `tokens.css` em arquivos existentes. A compilação Vite foi executada separadamente; o check de cores não foi desativado nem declarado aprovado.
- Endpoints verificados: autenticação, `GET /workspace`, `POST /files`, emissão/consumo autenticado de imagem, `POST /reports/{report_id}/reclassify`, `GET /reports/{report_id}/analysis` e classificação multipart nos testes de modelo.

## Transferência dos casos legados autorizada pelo usuário

Após o usuário relatar painel zerado, verificou-se que sua sessão estava no Hospital São José de Teresópolis, enquanto seis casos pertenciam a outra conta e a `__legacy__`. O usuário autorizou explicitamente a transferência para sua conta atual nessa instituição.

Foram transferidos 6 laudos associados, 6 extrações, 6 casos e 6 eventos em uma transação. Não havia arquivos ou análises de radiografia associados a esses casos. IDs, conteúdo, horários e histórico foram comparados antes/depois e preservados; o autor histórico dos eventos foi mantido. As constraints foram validadas e suas propriedades originais restauradas antes do commit. Não houve duplicação de registros nem remoção dos filtros de propriedade.

No Chrome da conta original, o painel passou a mostrar **2 críticos, 2 urgentes e 2 acionáveis**, totalizando 6 casos lidos pelo backend do PostgreSQL.

## Limitações e estado final

- Os limites temporários e o nome inválido dos pesos foram usados somente nos processos de teste. A API final voltou aos pesos e prazos normais; nenhum desses valores foi gravado no `.env`.
- Cancelar a espera no navegador não cancela uma transação já recebida pelo servidor; a execução pode concluir e persistir dentro dos prazos. Um novo clique enquanto o worker ainda está ocupado recebe `409`.
- Há um worker por processo da API. A validação foi local, com um processo HTTP; não foi um ensaio de carga ou uma validação de coordenação entre múltiplas réplicas.
- Memória do processo HTTP amostrada em aproximadamente 69 MiB. Não foi medido pico de RAM do worker: `psutil` não está instalado e a consulta Windows ao processo filho foi negada pelo ambiente. Não há afirmação de validação completa de RAM/VRAM; o serviço usa CPU.
- Os seis casos legados são demonstrações e continuam sem radiografias vinculadas: reclassificação nesses casos exige vincular a imagem correta. Não se associa uma imagem aleatória do catálogo a um caso.
- Grad-CAM é relevância estimada do modelo, sem validação espacial de referência. Os testes confirmam execução, persistência e interface; não validam diagnóstico, precisão anatômica ou uso clínico.
- A conta/laudo sintéticos de teste foram mantidos separados da conta do usuário. Nenhuma alteração foi commitada.
