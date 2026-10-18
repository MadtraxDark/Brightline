# Extração e avaliação do Brightline

Esta parte produz o cache offline importado no PostgreSQL local pelo backend. Os scripts de extração e avaliação usam Python 3.10 ou superior e somente a biblioteca padrão. O importador e a API usam as dependências de `requirements.txt`. Execute os comandos dentro de `backend/`. Os dados são sintéticos e os resultados precisam de revisão humana.

## Arquivos

- `data/reports.json`: 40 laudos e seus gabaritos.
- `prompts/extraction.txt`: regras e seis exemplos fixos, separados dos laudos avaliados.
- `extract.py`: chamadas Gemini Developer API e validação do resultado.
- `evaluate.py`: comparação determinística com o gabarito.
- `data/finding_aliases.json`: equivalências de nomes aprovadas por revisão humana; começa vazio.
- `brightline_data.py`: validação e escrita dos arquivos.

## Executar no PowerShell

Primeiro confira os dados sem acessar a rede:

```powershell
python extract.py --validate-only
```

Código de saída 2 significa cache incompleto, inclusive quando ele ainda não existe. Não é erro nos laudos.

Configure a chave Gemini Developer API criada no Google AI Studio. No PowerShell, ela fica somente nesta sessao:

```powershell
$secureKey = Read-Host 'Chave Gemini Developer API' -AsSecureString
$env:GEMINI_API_KEY = [System.Net.NetworkCredential]::new('', $secureKey).Password
$env:GEMINI_MODEL = 'gemini-3.5-flash-lite' # opcional; modelo padrao
python extract.py
python extract.py --validate-only
python evaluate.py
```

O extrator chama `generateContent` da Gemini Developer API e envia a chave no cabecalho `x-goog-api-key`, conforme a [documentacao oficial](https://ai.google.dev/api/generate-content). O modelo padrao aparece no nivel gratuito, sujeito a limites e disponibilidade que podem mudar. O Google informa que pode usar dados enviados no nivel gratuito para melhorar seus produtos. Nao envie laudos identificaveis ou dados sensiveis sem autorizacao e avaliacao de privacidade adequadas ([precos e uso dos dados](https://ai.google.dev/gemini-api/docs/pricing)).

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

## Importar no PostgreSQL local

Depois de iniciar o Docker Compose e cadastrar sua conta na API local:

```powershell
python import_local.py --validate-only
python import_local.py --email seu-email@exemplo.com --replace
```

O importador valida o conjunto completo, solicita a senha sem eco e envia os dados autenticados para `POST /imports`. Como alternativa, configure `BRIGHTLINE_ACCESS_TOKEN` e omita `--email`. `--replace` substitui os laudos/cache e recria os casos, eventos e relógio apenas da sua conta, em uma transação.

Os JSONs são o material de preparação; após importar, a fonte de dados da aplicação é o PostgreSQL no volume Docker. O reset usa os laudos e extrações persistidos, sem reler arquivos locais. Arquivos enviados pela rota `/files` também são gravados no banco. Cada conta local só acessa os próprios dados.
