# Brightline — sistema visual

## Direção aprovada
Em 17/10/2026, o usuário pediu menos informação simultânea e forneceu um dashboard SaaS como referência. A interface passa a usar navegação lateral escura, conteúdo claro, métricas compactas e tabela de laudos. Essa direção substitui o layout anterior de lista e detalhe permanentemente lado a lado.

## Hierarquia
- Visão geral: título, quatro indicadores do mock, busca, filtro de prioridade e tabela.
- Abrir um laudo substitui a visão geral por uma página de detalhe com retorno explícito.
- Laudo, Histórico e Conduta são seções alternáveis. Uma seção aparece por vez.
- Simulação fica recolhida em um controle da navegação.
- A tabela ordena urgência e, dentro de cada urgência, o menor prazo primeiro.

## Identidade
Logo original fornecida pelo usuário. Navegação em azul-marinho, superfícies brancas, fundo cinza muito claro e ações em grafite. Vermelho, laranja e azul nos selos clínicos continuam indicando urgência, com ícone e texto. Sem gráficos de séries temporais inventadas. Todas as cores ficam em src/styles/tokens.css.

## Tipografia e layout
Interface em Atkinson Hyperlegible Next; laudo em Source Serif 4, até 70ch. Página com margens de 40px no desktop, 24px em telas intermediárias e 16px no celular. Abaixo de 700px, navegação lateral vira navegação superior; tabela conserva laudo e prioridade, e informações completas ficam no detalhe. Controles principais de toque com pelo menos 44px. Bordas discretas e sem sombras decorativas; sombra apenas no painel flutuante de simulação.

## Referências
A imagem SaaS fornecida pelo usuário governa a composição atual. Impeccable orienta clareza, estados e organização; Web Design Guidelines orienta acessibilidade; Playwright CLI verifica o fluxo. A referência Cal.com em ../../docs/design-references é secundária.
