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

