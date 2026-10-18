# Brightline: regras de design

A direção visual vigente está em DESIGN.md. O pedido de 17/10/2026, acompanhado de uma referência SaaS, substitui as antigas restrições contra navegação lateral, logo e cartões de resumo.

- Menos informação simultânea: visão geral em tabela; detalhe aberto sob demanda.
- Navegação lateral escura no desktop e superior no celular.
- Logo original; ícone como favicon.
- Urgência nunca só por cor: usar UrgencyBadge com texto e ícone.
- Evidência no laudo em inversão de luminosidade.
- Cor definida em tokens.css. Contraste mínimo de 4,5:1 para texto comum.
- Atkinson Hyperlegible Next na interface; Source Serif 4 no texto do laudo.
- Não inventar séries históricas, gráficos ou dados clínicos.
- Não adicionar dependências de componentes ou gráficos para alterações visuais.
- Controles com foco visível, nomes acessíveis e estados de envio e erro.
- Barras de rolagem seguem o padrão global: discretas, com indicador arredondado, trilho neutro e realce no hover. Usar os tokens `--scrollbar-*`; não criar estilos isolados por componente. Em superfícies escuras, ajustar apenas os tokens locais. Preservar rolagem nativa no toque, navegação por teclado e alto contraste. Nunca ocultar barras necessárias; a lateral continua sem rolagem horizontal.

## Contrato assumido em `src/api.js`

O repositório não trazia o contrato do backend. Os nomes abaixo são o mock atual. Trocar o mock pela API real só muda `src/api.js`.

- `GET /stats` → `{ open, critical, escalated, avg_time_to_read_hours }`
- `GET /cases?view=queue|unflagged`
- `GET /cases/:id`
- `POST /cases/:id/read`
- `POST /cases/:id/actions` `{ text }`
- `POST /cases/:id/close`
- `GET /simulation` → `{ offset_hours }`
- `POST /simulation/advance` `{ hours }` → `{ offset_hours, escalated_ids }`
- `POST /simulation/reset`

Campos de caso: `id`, `finding_name`, `urgency`, `current_target`, `time_remaining_hours`, `flagged_by_radiologist`, `status`, `times_escalated`. No detalhe, também `confidence` (`alta` | `media` | `baixa`), `modality`, `radiologist`, `requesting_physician`, `report_text`, `evidence`, `timeline[]` com `label` e `offset_hours`.

`status`: `detected`, `notified`, `read`, `action_recorded`, `closed`, `escalated`.

### Lista clínica de casos

Na visão geral, cada caso apresenta achado e prazo, modalidade e identificação do laudo, texto original, médico solicitante, radiologista e clínica de origem. O responsável pelo acompanhamento fica separado da autoria e da solicitação. A clínica é lida do campo opcional `source_clinic` do laudo; dados ausentes aparecem como “Não informada”, sem criar identidades fictícias. Em telas pequenas, o acompanhamento passa para abaixo do conteúdo clínico.

A classificação da Luna aparece junto aos dados de origem, com status “Classificado”. Percentuais devem vir de `confidence_percent` (0–100): >80 verde, 20–80 amarelo, <20 vermelho. Confiança categórica não deve ser convertida em percentual fictício; apresentar o nível e “Percentual não fornecido”.

Abertura de laudos: documento com acomodação de escala e recorte, imagem com revelação lateral e duração máxima de 420ms. Executar somente na troca do caso, sem espera artificial e sem repetir em atualizações do relógio ou da conversa. Respeitar prefers-reduced-motion com conteúdo estático.

Transições entre seções internas: saída de 120ms e entrada de 240ms, com deslocamento e recorte discretos; navegação de retorno inverte a direção. Aplicar também nas mudanças de prioridade. A camada central substitui animações locais duplicadas, respeita movimento reduzido e aceita seleção rápida de outro destino.

Campos de texto: desabilitar redimensionamento manual (resize:none) em toda a interface. Compositores de chat podem crescer automaticamente até uma altura máxima e então usar rolagem interna.

### Mobile clínico

Até 700px: resumo de prioridades em faixa segmentada, com aviso clínico abaixo; comunicação em três etapas horizontais; documento com médicos em duas colunas e classificação destacada; imagem em prévia compacta e visualizador de toque em tela inteira. Chat geral da Luna ocupa toda a tela, bloqueia a página de fundo e mantém foco nos seus controles. Navegação de seção retorna ao topo; mudanças de filtro preservam a posição. Transições e indicadores respeitam movimento reduzido.

Visualizador mobile: gestos diretos (arraste para mover e pinça para zoom), sem alternância C ou botões de zoom de desktop. Ferramentas com rótulos Ponto, Área e Centralizar. Marcação de ponto exige toque sem deslocamento; área exige arraste mínimo. Pinça cancela o desenho em andamento. Ao terminar uma seleção, voltar à navegação por gestos.
