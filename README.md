# Brightline

**Critical findings, never lost in the report.**

Protótipo para identificar achados prioritários em laudos de imagem e acompanhar sua comunicação até a confirmação de leitura. A proposta combina uma segunda leitura por IA com uma fila de casos, prazos e escalonamento quando o responsável não confirma a leitura.

O projeto trabalha com **laudos sintéticos em português**. A IA sugere e uma pessoa valida. As métricas deste conjunto são ilustrativas e não representam desempenho clínico.

## Estado atual

| Componente | Disponível neste repositório |
|---|---|
| Dados | 40 laudos sintéticos com gabaritos e casos difíceis |
| Prompt | Regras de extração e seis exemplos fixos |
| Extração | Script que chama Claude, valida as evidências e salva o cache |
| Avaliação | Precisão, recall, recall crítico e detalhamento de erros |
| Backend | Estrutura FastAPI, modelos, criação das tabelas SQLite e `GET /health` |
| Fluxo operacional | Carga dos laudos, casos, confirmação, escalonamento e relógio simulado ainda pendentes |
| Frontend | Ainda não implementado |

O cache real e as métricas são gerados após executar a extração com uma chave de API. Os testes automatizados usam respostas simuladas.

## Como as partes se conectam

Fluxo planejado:

```text
reports.json → extract.py + Claude → extractions_cache.json
     │                                       │
     └──────────── evaluate.py ────────────────┘
                                             │
                                             ▼
                                   Backend FastAPI + SQLite
                                             │
                                             ▼
                                      Frontend React
```

A chamada ao modelo acontece na preparação dos dados. A demonstração deve consumir o cache salvo, sem depender de chamadas ao modelo ao vivo. A importação desse cache pelo backend ainda precisa ser implementada.

## Começar no Windows

Requisito: **Python 3.10 ou superior**. Execute os comandos a partir da raiz do projeto, no PowerShell.

Crie um ambiente virtual:

```powershell
python -m venv .venv
```

Os exemplos usam o executável do ambiente diretamente, sem precisar ativá-lo. Os scripts de IA usam apenas a biblioteca padrão do Python; as dependências de `requirements.txt` são necessárias para o backend.

### 1. Conferir os dados

```powershell
.\.venv\Scripts\python.exe extract.py --validate-only
```

Na primeira execução, o esperado é encontrar 40 laudos válidos e 40 extrações pendentes. Código de saída `2` indica cache incompleto; não significa que os laudos sejam inválidos.

### 2. Gerar as extrações

É necessário acesso à API Anthropic e um modelo disponível na sua conta. As chamadas são cobradas pelo provedor. Informe a chave no prompt abaixo; ela não será exibida nem gravada em arquivo pelo comando.

```powershell
$secureKey = Read-Host 'Chave da API Anthropic' -AsSecureString
$env:ANTHROPIC_API_KEY = [System.Net.NetworkCredential]::new('', $secureKey).Password
$env:ANTHROPIC_MODEL = Read-Host 'ID do modelo Claude disponível na sua conta'

.\.venv\Scripts\python.exe extract.py
.\.venv\Scripts\python.exe extract.py --validate-only
```

A configuração vale para a sessão atual do PowerShell. O script lê as variáveis de ambiente; não carrega arquivos `.env` automaticamente.

Cada resposta precisa respeitar o contrato e conter evidências copiadas literalmente do laudo. O script faz até três tentativas por laudo, salva o progresso e continua quando um item falha. O gabarito não é enviado ao modelo.

### 3. Avaliar os resultados

```powershell
.\.venv\Scripts\python.exe evaluate.py
```

A avaliação imprime precisão, recall geral, **recall da classe crítica**, falsos positivos, falsos negativos e trocas de urgência. O relatório completo fica em `data/evaluation.json`.

O pareamento exige o mesmo achado e a mesma urgência dentro do mesmo laudo. Diferenças de caixa, acentos e pontuação são normalizadas; sinônimos exigem revisão e equivalências explícitas em `data/finding_aliases.json`. Uma urgência errada conta como falso positivo e falso negativo, além de ser listada separadamente.

Laudos ausentes no cache não são descartados da avaliação: seus achados contam como falsos negativos e o resultado fica marcado como incompleto. Denominadores iguais a zero aparecem como `N/A`, em vez de uma porcentagem inventada.

## Retomar e comparar versões

```powershell
# Retoma os laudos pendentes, preservando extrações válidas
.\.venv\Scripts\python.exe extract.py

# Tenta novamente apenas os IDs registrados como falhos
.\.venv\Scripts\python.exe extract.py --retry-failed

# Executa novamente todos os laudos
.\.venv\Scripts\python.exe extract.py --force

# Salva uma iteração separada
.\.venv\Scripts\python.exe extract.py --cache data/iteracao_01/extractions_cache.json
.\.venv\Scripts\python.exe evaluate.py --cache data/iteracao_01/extractions_cache.json --output data/iteracao_01/evaluation.json
```

Alterar o texto de um laudo, o prompt ou o modelo invalida o cache correspondente. Depois dessas mudanças, use a execução normal para recompor as pendências. Arquive também o prompt e os aliases usados em cada avaliação para comparar as versões.

| Arquivo gerado | Conteúdo |
|---|---|
| `data/extractions_cache.json` | Extrações válidas, indexadas por `report_id` |
| `data/extractions_cache.errors.json` | Falhas que precisam de nova tentativa ou revisão |
| `data/extractions_cache.meta.json` | Hashes usados para identificar resultados desatualizados |
| `data/evaluation.json` | Métricas, cobertura e lista de erros |

Os comandos de extração e avaliação retornam `0` quando completos, `2` quando há extrações pendentes e `1` para erros de configuração, arquivo ou formato.

## Rodar o backend

Na raiz do projeto:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload
```

- Verificação de funcionamento: [localhost:8000/health](http://localhost:8000/health), com resposta `{"status":"ok"}`.
- Documentação da API: [localhost:8000/docs](http://localhost:8000/docs).

Na inicialização, o backend cria `backend/brightline.db` e as tabelas vazias. A API atual não importa os JSONs nem disponibiliza endpoints de casos ou simulação. O caminho do banco é definido no código; variáveis como `BRIGHTLINE_DATA_DIR` e `BRIGHTLINE_DB_PATH` ainda não são suportadas.

## Testes

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Os testes cobrem o contrato dos dados, evidência literal, novas tentativas, retomada do lote, invalidação do cache e cálculo das métricas. Usam arquivos temporários e respostas simuladas, sem consumir a API ou gerar resultados para a demonstração.

## Estrutura do projeto

```text
Brightline/
├── data/
│   ├── reports.json             # Laudos sintéticos e gabaritos
│   ├── revisao_laudos.md        # Inventário e pontos para revisão humana
│   └── finding_aliases.json     # Equivalências de nomes revisadas
├── prompts/extraction.txt      # Instruções e exemplos fixos
├── extract.py                  # Extração e cache
├── evaluate.py                 # Avaliação e análise de erros
├── brightline_data.py          # Contrato e persistência compartilhados
├── tests/test_ai_pipeline.py   # Testes dos scripts de IA e dados
├── backend/app/main.py         # Estrutura inicial da API
├── requirements.txt           # Dependências do backend
└── IA_DADOS.md                 # Guia detalhado de extração e avaliação
```

`data/reports.json` e `data/extractions_cache.json` estão ignorados pelo Git na configuração atual. Ao compartilhar um clone com a equipe, disponibilize esses arquivos separadamente.

## Dados e revisão humana

O conjunto contém oito laudos críticos, oito urgentes, oito acionáveis, oito controles sem alerta e oito casos adicionais de dificuldade. Há negações, achados conhecidos e estáveis, suspeitas, achados omitidos na conclusão e múltiplos achados no mesmo laudo. Os textos não possuem imagens reais associadas.

Antes de fechar uma versão, revise os gabaritos, os falsos positivos e negativos e as evidências. Os prazos do protótipo são `critical = 1h`, `urgent = 24h` e `actionable = 720h`; são parâmetros da demonstração, não protocolos clínicos. Apresente os resultados como **avaliação em conjunto sintético pequeno, ilustrativa**.

Detalhes adicionais: [guia de IA e dados](IA_DADOS.md) e [revisão dos laudos](data/revisao_laudos.md).
