# API de dados e radiografias

## Arquitetura

O frontend conversa com o backend FastAPI por HTTP em `/api` (proxy Vite no desenvolvimento). O backend autentica as rotas privadas com `Authorization: Bearer <access_token>` e consulta o PostgreSQL por meio de `psycopg`. O navegador nunca recebe credenciais do banco nem executa SQL.

O PostgreSQL é a fonte dos metadados e dos registros estruturados. A tabela `dataset_images` guarda o identificador do arquivo, paciente do dataset, rótulos NIH, SHA-256, data de importação e os bytes da radiografia. Os arquivos enviados durante uma análise ficam em `files`, vinculados ao laudo em `report_files`. Análises persistidas ficam em `report_analyses`; análises iniciadas a partir de uma imagem do catálogo ficam em `dataset_image_analyses`, isoladas pela conta e pela instituição ativa. Laudos, casos, eventos, arquivos e análises pertencem à instituição selecionada na sessão autenticada. O backend atual não serve caminhos de disco: os arquivos NIH são lidos da pasta de importação e copiados para o banco.

## Catálogo NIH

As rotas de metadados e emissão de links requerem autenticação. A rota de conteúdo usa o token temporário e não exige bearer token.

### `GET /dataset/images`

Lista imagens com paginação. Parâmetros:

| Parâmetro        | Tipo    | Padrão / limite             | Descrição                                                            |
| ---------------- | ------- | --------------------------- | -------------------------------------------------------------------- |
| `offset`         | inteiro | `0`, máximo `1000000`       | Deslocamento da página                                               |
| `limit`          | inteiro | `24`, máximo `100`          | Quantidade por página                                                |
| `dataset`        | texto   | `nih-chestxray14`           | Dataset disponível                                                   |
| `pathology`      | texto   | opcional, até 80 caracteres | Filtra os rótulos anotados no NIH                                    |
| `patient_id`     | texto   | opcional, até 32 caracteres | Filtra o identificador do paciente no dataset                        |
| `classification` | texto   | opcional, até 80 caracteres | Filtra imagens com análise salva do usuário que inclua essa previsão |

`pathology` e `classification` não podem ser usados juntos. O primeiro filtra anotações do dataset; o segundo filtra resultados do modelo salvos para a conta atual. O retorno contém `items`, `pagination` e uma rota `image_url` do backend para solicitar um link de visualização.

Exemplo:

```http
GET /api/dataset/images?pathology=Effusion&offset=0&limit=24
Authorization: Bearer <access_token>
```

```json
{
  "items": [
    {
      "id": "00000001_000.png",
      "dataset": "nih-chestxray14",
      "patient_id": "00000001",
      "finding_labels": ["Effusion"],
      "sha256": "…",
      "has_analysis": false,
      "image_url": "/dataset/images/00000001_000.png/signed-url"
    }
  ],
  "pagination": { "offset": 0, "limit": 24, "total": 1, "next_offset": null }
}
```

### `GET /dataset/images/{filename}`

Obtém os metadados de uma imagem. Retorna `404` se ela não existir. O nome deve ser um nome de arquivo simples; caminhos e traversal são rejeitados.

### `POST /dataset/images/{filename}/signed-url`

Emite um link de leitura válido por 60 segundos. O token é aleatório, armazenado no banco somente como hash e associado ao arquivo. A URL não revela caminhos do host.

```json
{
  "url": "/dataset/images/00000001_000.png/content?token=<temporário>",
  "expires_in": 60
}
```

### `GET /dataset/images/{filename}/content?token=…`

Entrega os bytes associados ao link temporário, com MIME derivado da extensão validada, `Cache-Control: private` e `X-Content-Type-Options: nosniff`. Tokens inexistentes ou expirados retornam `404`.

### Análises de imagem do catálogo

- `POST /dataset/images/{filename}/classify` executa o modelo NIH sobre os bytes já presentes no banco e salva a última análise para a conta autenticada.
- `GET /dataset/images/{filename}/analysis` retorna a análise salva dessa conta; retorna `404` quando ainda não há resultado.
- Cada resultado informa probabilidades, previsões, versão/metadados do modelo, estado `review_required` e limitações. É uma saída experimental, não um diagnóstico.

## Laudos e uploads existentes

- `POST /reports/analyze` continua aceitando laudo e radiografia, persistindo metadados, análise e arquivos no PostgreSQL.
- `GET /reports/{report_id}/analysis` recupera a análise já salva pertencente à conta autenticada.
- `POST /reports/{report_id}/radiograph-url` emite link temporário apenas para uma radiografia vinculada ao laudo daquela conta.
- `POST /radiographs/classify` classifica upload PNG/JPEG de até 10 MB e agora requer bearer token. Essa rota não persiste o arquivo nem a saída.

## Exemplo de consumo no frontend

O cliente deve usar `VITE_AUTH_API_URL` (padrão `/api`), ler o access token da sessão e enviá-lo no cabeçalho `Authorization`. Para exibir uma imagem, chamar a rota autenticada de `signed-url` e resolver o caminho relativo devolvido com a base configurada da API antes de usar em `<img src>`. Não construir URL de disco nem acessar o PostgreSQL. O helper `frontend/src/radiographApi.js` implementa esses pedidos e a tela `/radiografias` mostra catálogo, filtro, paginação, visualização e análise salva.

Uploads enviados ao backend usam `FormData`; não definir manualmente `Content-Type` para multipart, pois o navegador inclui o boundary. Exibir erros HTTP ao usuário e tratar `401` como sessão expirada. A API usa `422` para parâmetros inválidos, `404` para recurso/link ausente, `413` para tamanho excedido, `415` para tipo não aceito e `503` quando o serviço do modelo está indisponível.

## Configuração e importação

Configure `DATABASE_URL` no `.env` da raiz ou em `backend/.env`, por exemplo `postgresql://brightline:senha@localhost:5433/brightline`. O Compose expõe PostgreSQL na porta 5433 e a API em 8080; o desenvolvimento local usa a API na porta 8000. A API não precisa de um diretório de imagens em runtime, porque a tabela `dataset_images` contém os bytes.

Para importar NIH a partir de um diretório local (inclusive `D:\...` no Windows), execute `python -m backend.import_nih_images --data-dir "D:\\dados\\nih"` na raiz do projeto. A pasta deve conter `Data_Entry_2017_v2020.csv` e `images/`. Em container, monte o conjunto no container e passe o caminho montado, por exemplo `/data/nih`. A importação valida a presença das imagens antes de gravar e usa `filename` como chave para evitar duplicação. Não armazene caminhos absolutos no banco.

Execute `python -m backend.migrate` para aplicar migrações pendentes, incluindo `004_dataset_image_api.sql` e `005_institutional_dataset_analyses.sql`. O SQL inicial também cria as tabelas necessárias em instalações novas.

## Segurança, consistência e operação

- Rotas do catálogo e análises verificam a sessão antes de consultar dados; análises salvas e dados clínicos são limitados ao proprietário e à instituição ativa.
- A lista lê metadados do PostgreSQL e devolve no máximo 100 itens por página. As consultas usam parâmetros SQL, ordenação estável e limites validados.
- `dataset_images` permanece a fonte canônica de labels e arquivo; frontend não replica metadados como fonte operacional.
- Links temporários de conteúdo são emitidos somente após a sessão e a existência do arquivo serem verificadas. O endpoint de conteúdo aceita token aleatório com validade de 60 segundos e não aceita caminho fornecido pelo usuário.
- Respostas de classificação mantêm `human_review_required: true`; resultados e labels do ChestX-ray14 não devem ser usados para diagnóstico, triagem ou tratamento.
