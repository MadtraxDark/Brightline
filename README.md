# Brightline

**Critical findings, never lost in the report.**

Protótipo para identificar achados prioritários em laudos de imagem e acompanhar a comunicação até a confirmação de leitura. A IA sugere e uma pessoa valida. Os laudos são sintéticos; os resultados são ilustrativos e não representam desempenho clínico.

## Arquitetura

O **Supabase** fornece Postgres, Auth e Storage privado. A API FastAPI valida sessões no Supabase Auth e encaminha o token do usuário à Data API e ao Storage. As políticas RLS isolam os dados por conta. As transições e o relógio são processados em transações no Postgres.

```text
reports.json → extract.py + Claude → extractions_cache.json
     │                                       │
     └──────────── evaluate.py ────────────────┘
                                             │
                               import_supabase.py + API
                                             │
                        Supabase Postgres + Auth + Storage
                                             │
                              API FastAPI → futuro frontend
```

Os arquivos JSON continuam como material de preparação e avaliação offline. Depois da importação, laudos, extrações, casos, eventos e relógio são persistidos no Supabase. A demo não faz chamadas ao LLM ao vivo. A conexão com o Supabase exige rede.

## O que já existe

| Componente | Implementação |
|---|---|
| Dados | 40 laudos sintéticos, gabaritos e casos difíceis |
| IA | Prompt com seis exemplos; extração com validação de evidência e retomada |
| Avaliação | Precisão, recall, recall crítico e lista de erros |
| Auth | Cadastro, login por e-mail/senha, renovação, usuário atual e logout |
| Banco | Migração Postgres, RLS e funções transacionais |
| Casos | Lista, detalhe, confirmação, ação, encerramento, não sinalizados e estatísticas |
| Simulação | Relógio persistido, escalonamento e reset dos dados da conta |
| Arquivos | Upload para bucket privado e URL assinada por 60 segundos |
| Frontend | Ainda não implementado |

**A migração SQL precisa ser aplicada ao projeto antes de usar os dados.** Iniciar o servidor não executa migrações nem importa arquivos automaticamente.

## Começar no Windows

Requisito: **Python 3.10 ou superior**, um projeto Supabase e acesso à API Anthropic para gerar extrações. Execute os comandos na raiz, pelo PowerShell.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Os comandos usam o Python do ambiente diretamente, sem precisar ativá-lo.

### 1. Configurar o Supabase

Se ainda não existe `.env`, copie o exemplo:

```powershell
Copy-Item .env.example .env
```

Preencha no `.env`:

```dotenv
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUBSTITUA
BRIGHTLINE_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Também são aceitas `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. A chave publicável identifica o projeto; ela não é uma sessão de usuário. A API requer `Authorization: Bearer <access_token>` nas rotas de dados. Não configure chave `service_role` ou `sb_secret_` nestas variáveis.

O backend e o importador carregam o `.env` da raiz. Os scripts offline `extract.py` e `evaluate.py` mantêm seu funcionamento independente; para extração, configure as variáveis Anthropic na sessão do terminal.

### 2. Aplicar a migração

No **SQL Editor** do projeto Supabase, execute o conteúdo de:

[`supabase/migrations/202610170001_brightline.sql`](supabase/migrations/202610170001_brightline.sql)

A migração cria tabelas, políticas de acesso, uma RPC e o bucket privado `brightline-files`. É transacional e deve ser executada uma única vez; se objetos homônimos já existirem, revise o conflito antes de aplicar. Não exponha o schema `brightline_private` na Data API.

Em **Authentication**, habilite o provedor Email e configure a URL do site e redirecionamentos para o endereço do frontend quando ele existir. Se a confirmação de e-mail estiver habilitada, o cadastro precisa ser confirmado antes do login.

Veja o [guia do Supabase](supabase/README.md) para detalhes das políticas e validação.

### 3. Iniciar a API e criar uma sessão

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload
```

- [Documentação interativa](http://localhost:8000/docs)
- [Health check](http://localhost:8000/health)

### Executar com Docker e Nginx

Requisito: Docker Desktop com Docker Compose. Copie o arquivo de exemplo e preencha as credenciais publicáveis do Supabase no `.env` da raiz:

```powershell
Copy-Item .env.example .env
```

Depois, na raiz do projeto:

```powershell
docker compose up --build -d
docker compose logs -f
```

A API ficará disponível por meio do Nginx em `http://localhost:8080`; abra `http://localhost:8080/docs` para o Swagger. Para encerrar, use `docker compose down`. O Nginx é o único serviço publicado no host; a API fica na rede interna do Compose. Os valores `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` são passados ao container pela configuração local e não são copiados para a imagem.

Outros computadores na mesma rede podem acessar `http://IP-DA-MAQUINA:8080`, desde que o firewall permita conexões nessa porta. Para acesso público pela internet, use um servidor público e configure HTTPS no Nginx antes de compartilhar o endereço. Se o frontend estiver em outra origem, atualize `BRIGHTLINE_CORS_ORIGINS` no `.env` com a origem exata e recrie os serviços com `docker compose up -d`.

No Swagger, use `POST /auth/signup` para cadastrar e `POST /auth/login` para entrar. Copie o `access_token`, clique em **Authorize** e informe o token sem o prefixo `Bearer`. Não compartilhe tokens ou senhas. `GET /auth/me` confirma a sessão; `GET /ready` também verifica o acesso às tabelas.

O cadastro pode retornar um usuário sem sessão enquanto aguarda confirmação de e-mail. Ao renovar uma sessão, o cliente deve substituir tanto o access token quanto o refresh token pelos novos valores. Logout revoga o refresh token da sessão; um access token já emitido pode permanecer válido até expirar.

### 4. Gerar e avaliar as extrações

Valide os laudos sem acessar a API de IA:

```powershell
.\.venv\Scripts\python.exe extract.py --validate-only
```

Configure a chave Anthropic sem escrevê-la em arquivo:

```powershell
$secureKey = Read-Host 'Chave da API Anthropic' -AsSecureString
$env:ANTHROPIC_API_KEY = [System.Net.NetworkCredential]::new('', $secureKey).Password
$env:ANTHROPIC_MODEL = Read-Host 'ID do modelo Claude disponível na sua conta'

.\.venv\Scripts\python.exe extract.py
.\.venv\Scripts\python.exe extract.py --validate-only
.\.venv\Scripts\python.exe evaluate.py
```

As chamadas Anthropic são cobradas pelo provedor. O script não envia gabarito nem sinalização do radiologista ao modelo. Faz até três tentativas por laudo e exige que cada evidência apareça literalmente no texto.

A avaliação produz `data/evaluation.json`, com precisão, recall, **recall crítico**, falsos positivos, falsos negativos e trocas de urgência. Pareia nome normalizado e urgência no mesmo laudo; equivalências semânticas exigem revisão em `data/finding_aliases.json`. Urgência errada conta como FP e FN. Extrações ausentes contam como falsos negativos e marcam a avaliação como incompleta.

### 5. Importar no Supabase

Com a API em execução e o cache completo:

```powershell
.\.venv\Scripts\python.exe import_supabase.py --validate-only
.\.venv\Scripts\python.exe import_supabase.py --email seu-email@exemplo.com --replace
```

O importador solicita a senha sem eco. Como alternativa, configure `BRIGHTLINE_ACCESS_TOKEN` e omita `--email`.

**`--replace` substitui os laudos e extrações da conta autenticada, recria seus casos e reinicia seu relógio e eventos.** A operação é atômica e não afeta outras contas. `POST /simulate/reset` repete a demo usando os dados já importados no Supabase, sem reler os arquivos locais.

## Rotas da API

Todas as rotas de dados exigem sessão válida. `/health`, cadastro, login e renovação são públicos; o serviço Supabase aplica suas regras de Auth.

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/health` | Verificar o processo da API |
| GET | `/ready` | Verificar sessão e acesso ao banco |
| POST | `/auth/signup` | Cadastro com e-mail e senha |
| POST | `/auth/login` | Criar sessão |
| POST | `/auth/refresh` | Renovar sessão |
| GET | `/auth/me` | Consultar usuário autenticado |
| POST | `/auth/logout` | Encerrar a sessão atual |
| POST | `/imports` | Substituir o conjunto da conta e criar casos |
| GET | `/cases?urgency=&status=` | Listar casos por prioridade e prazo |
| GET | `/cases/{id}` | Consultar laudo, caso e eventos |
| POST | `/cases/{id}/acknowledge` | Confirmar leitura, corpo `{"by":"nome"}` |
| POST | `/cases/{id}/action` | Registrar ação, corpo `{"action":"texto","close":true}` |
| GET | `/simulate` | Consultar `sim_now` |
| POST | `/simulate/advance?hours=N` | Avançar o relógio; retorna `sim_now` e `changed_cases` |
| POST | `/simulate/reset` | Recriar os casos a partir dos dados importados |
| GET | `/missed` | Casos críticos/urgentes não sinalizados |
| GET | `/stats` | Contagens e tempo médio até confirmação |
| POST | `/files` | Upload binário JSON, PNG, JPEG ou PDF, até 10 MB |
| POST | `/files/{file_id}/signed-url` | Obter URL de leitura válida por 60 segundos |

Cada avanço do relógio escala no máximo um nível: solicitante → radiologista → coordenação. Casos lidos ou encerrados não escalam. Os prazos do protótipo são crítico 1h, urgente 24h e acionável 720h; não são protocolos clínicos.

## Retomar extrações e comparar iterações

```powershell
# Retoma pendências sem repetir resultados válidos da mesma configuração
.\.venv\Scripts\python.exe extract.py

# Repete somente falhas registradas
.\.venv\Scripts\python.exe extract.py --retry-failed

# Força nova extração de todos os laudos
.\.venv\Scripts\python.exe extract.py --force

# Preserva os resultados de uma iteração
.\.venv\Scripts\python.exe extract.py --cache data/iteracao_01/extractions_cache.json
.\.venv\Scripts\python.exe evaluate.py --cache data/iteracao_01/extractions_cache.json --output data/iteracao_01/evaluation.json
```

Alterações de laudo, prompt ou modelo invalidam o cache correspondente. Arquive também o prompt e os aliases de cada avaliação. Extração/avaliação retornam `0` quando completas, `2` quando há extrações pendentes e `1` em erro.

## Testes

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Os testes Python usam respostas simuladas do Claude e do Supabase; não criam contas nem consomem APIs externas. O [guia do Supabase](supabase/README.md) explica como verificar também a migração em Postgres embarcado.

## Estrutura

```text
Brightline/
├── backend/app/                # API, configuração, modelos e cliente Supabase
├── supabase/migrations/        # Tabelas, RPC, RLS e Storage
├── supabase/tests/             # Verificação da migração em Postgres
├── data/reports.json           # 40 laudos sintéticos e gabaritos
├── data/finding_aliases.json    # Equivalências revisadas para avaliação
├── prompts/extraction.txt      # Prompt e seis exemplos fixos
├── extract.py                  # Extração offline
├── evaluate.py                 # Avaliação
├── import_supabase.py          # Importação autenticada
├── brightline_data.py          # Contrato dos arquivos
├── tests/                      # Testes Python
├── .env.example                # Configuração de referência
└── IA_DADOS.md                 # Guia detalhado da preparação dos dados
```

O `.env`, os laudos e o cache local estão ignorados pelo Git. Ao compartilhar um clone, disponibilize os dados sintéticos à equipe separadamente.

## Escopo e revisão

O conjunto inclui negações, achados conhecidos e estáveis, suspeitas, achados omitidos na conclusão e múltiplos achados. Não há imagens reais associadas. Revise gabaritos, evidências e erros antes de apresentar as métricas.

A autorização inicial é **por conta**: usuários diferentes não compartilham casos. Colaboração por hospital/equipe requer um modelo explícito de membros e permissões. Não há frontend, análise de imagens, integração PACS/HL7/FHIR ou envio real de mensagens. O LLM permanece externo ao Supabase.

Referências locais: [guia de IA](IA_DADOS.md), [revisão dos laudos](data/revisao_laudos.md) e [backend](backend/README.md).
