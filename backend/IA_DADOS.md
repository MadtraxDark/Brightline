# Extração e avaliação do Brightline

Esta parte produz o cache offline importado no Supabase pelo backend. Os scripts de extração e avaliação usam Python 3.10 ou superior e somente a biblioteca padrão. O importador e a API usam as dependências de `requirements.txt`. Execute os comandos dentro de `backend/`. Os dados são sintéticos e os resultados precisam de revisão humana.

## Arquivos

- `data/reports.json`: 40 laudos e seus gabaritos.
- `prompts/extraction.txt`: regras e seis exemplos fixos, separados dos laudos avaliados.
- `extract.py`: chamadas ao Claude e validação do resultado.
- `evaluate.py`: comparação determinística com o gabarito.
- `data/finding_aliases.json`: equivalências de nomes aprovadas por revisão humana; começa vazio.
- `brightline_data.py`: validação e escrita dos arquivos.

## Executar no PowerShell

Primeiro confira os dados sem acessar a rede:

```powershell
python extract.py --validate-only
```

Código de saída 2 significa cache incompleto, inclusive quando ele ainda não existe. Não é erro nos laudos.

Configure a chave sem escrevê-la nos arquivos. O comando abaixo pede a chave sem exibi-la e a disponibiliza somente nesta sessão do PowerShell:

```powershell
$secureKey = Read-Host 'Chave da API Anthropic' -AsSecureString
$env:ANTHROPIC_API_KEY = [System.Net.NetworkCredential]::new('', $secureKey).Password
$env:ANTHROPIC_MODEL = Read-Host 'ID do modelo Claude disponível na sua conta'
python extract.py
python extract.py --validate-only
python evaluate.py
```

As chamadas à API são cobradas pelo provedor. O modelo é explícito para não depender de um nome presumido ou indisponível na conta. Não é necessário configurar chave para avaliar um cache existente. O script usa `POST https://api.anthropic.com/v1/messages`, conforme a [documentação oficial](https://platform.claude.com/docs/en/api/messages/create).

O script só envia ID e texto ao modelo. O gabarito e a sinalização do radiologista não são enviados. Valida JSON, campos, ID, urgência, prazo, confiança e presença literal de cada evidência. São no máximo três tentativas por laudo: uma inicial e duas novas tentativas. Uma falha não vira `findings: []` e não interrompe os outros laudos.

O progresso é salvo após cada laudo, por substituição atômica. Saídas válidas entram em `data/extractions_cache.json`; falhas ficam em `data/extractions_cache.errors.json`; hashes de texto, prompt e modelo ficam em `data/extractions_cache.meta.json`. O contrato do cache permanece um dicionário de ID para objeto com `report_id` e `findings`.

## Retomar e iterar

```powershell
# Retoma falhas e pendências, preservando extrações válidas da mesma configuração
python extract.py

# Executa apenas IDs registrados como falhos
python extract.py --retry-failed

# Reextrai todos, mesmo com cache válido
python extract.py --force
```

Alterações de texto, prompt ou modelo invalidam as entradas correspondentes. Após essas alterações, use o comando normal, sem `--retry-failed`, para recompor todas as pendências. Cache importado sem metadados pode ser validado/avaliado, mas será reextraído na próxima execução normal para registrar sua procedência.

Para comparar iterações sem sobrescrever resultados, escolha outro caminho:

```powershell
python extract.py --cache data/iteracao_01/extractions_cache.json
python evaluate.py --cache data/iteracao_01/extractions_cache.json --output data/iteracao_01/evaluation.json
```

Copie também a versão do prompt usada para cada iteração ou passe `--prompt` com um arquivo versionado. Registre o ajuste e seu efeito. Faça as 3 a 5 iterações previstas somente após obter resultados reais e revisar os erros. Não há métricas de LLM produzidas antes de chamar a API.

## Interpretar a avaliação

O acerto exige mesmo laudo, mesmo achado e mesma urgência. O pareamento é um a um. Nomes são comparados após normalização de caixa, acentos, espaços e pontuação. Não há pareamento por similaridade automática: lateralidade, local e incerteza não devem desaparecer por aproximação.

Como o modelo pode usar sinônimos, um nome semanticamente equivalente pode aparecer inicialmente como FP e FN. Revise o texto e, se forem equivalentes, registre em `data/finding_aliases.json` o mapeamento da variante para o nome canônico do gabarito. Exemplo ilustrativo de formato:

```json
{
  "variante produzida pela IA": "nome correspondente no gabarito"
}
```

Aliases não devem juntar locais, lados ou graus de certeza diferentes. Não use cadeias de equivalências. Mantenha o mesmo arquivo de aliases ao comparar iterações e arquive sua versão junto dos resultados.

A avaliação imprime precisão, recall, recall da classe critical, todos os falsos positivos/negativos e as trocas de urgência. Salva os detalhes em `data/evaluation.json`. Troca de urgência conta como FP e FN e também aparece separadamente. Denominador zero gera `null` no JSON e N/A no terminal, sem inventar 100%.

Se faltam laudos no cache, a avaliação marca `complete=false`, retorna código 2 e contabiliza os achados desses laudos como falsos negativos. Isso impede aumentar artificialmente o recall excluindo falhas. IDs desconhecidos e extrações inválidas são rejeitados. Avaliação completa retorna código 0; problemas de formato/configuração retornam 1.

O avaliador confere o contrato e o pareamento; não confirma clinicamente os gabaritos nem prova que toda doença foi extraída de forma correta. Relate sempre: “avaliação em conjunto sintético pequeno, ilustrativa”. Exemplos do prompt e variantes ajustadas repetidamente não constituem validação independente.

## Verificação e entrega ao backend

```powershell
python -m unittest discover -s tests -v
python extract.py --validate-only
python evaluate.py
```

Os testes usam respostas simuladas e diretórios temporários, sem API externa e sem preencher o cache da demonstração. A suíte completa inclui testes do backend e requer instalar `requirements.txt`. Antes da demo, exija 40/40 extrações válidas, nenhuma evidência inválida e revisão dos casos difíceis e das suspeitas de R-036 a R-038.

## Importar no Supabase

Depois de aplicar a migração do [guia do Supabase](supabase/README.md), iniciar a API e cadastrar sua conta:

```powershell
python import_supabase.py --validate-only
python import_supabase.py --email seu-email@exemplo.com --replace
```

O importador valida o conjunto completo, solicita a senha sem eco e envia os dados autenticados para `POST /imports`. Como alternativa, configure `BRIGHTLINE_ACCESS_TOKEN` e omita `--email`. `--replace` substitui os laudos/cache e recria os casos, eventos e relógio apenas da sua conta, em uma transação.

Os JSONs são o material de preparação; a fonte de dados da aplicação após a importação é o Supabase Postgres. O reset usa os laudos e extrações persistidos, sem reler arquivos locais. O Storage privado recebe arquivos pela rota `/files`, quando necessário. O modelo de acesso atual isola cada conta; colegas com logins diferentes não compartilham casos automaticamente.
