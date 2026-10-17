# Landing page Brightline

Modo da superfície: **Persuade**. O visitante deve entender o produto e experimentar a demonstração.

O visual mantém a identidade existente: azul-marinho, branco e verde suave; logo original; Atkinson Hyperlegible Next na interface e Source Serif 4 nas ênfases e evidências. A documentação do painel continua em DESIGN.md.

- O header mantém largura e margens estáveis, com navegação aberta no desktop. No topo é transparente e integra o hero; ao rolar, recebe fundo azul-marinho. No celular, usa o menu em tela cheia.
- O hero separa a mensagem principal da explicação e das ações no desktop. No celular, segue uma coluna, com texto legível e ação principal larga.
- A demonstração permite escolher achados e confirmar leituras. Lista e evidência aparecem lado a lado no desktop e empilhadas no celular. Os valores são ilustrativos e os laudos são fictícios.
- A prévia usa os mesmos `reports.json`, `extractions_cache.json` e `loadCases` do painel: todos os casos, evidências literais, prioridades, prazos e contagem de não sinalizados vêm dessa base. A confirmação na LP é independente da sessão do painel.
- Textos e perguntas frequentes apresentam a fila de não sinalizados, a avaliação da IA, a linha do tempo e a simulação de prazos e escalações. Métricas de exemplo não são divulgadas como desempenho clínico.
- A faixa de benefícios ocupa toda a largura da tela e usa movimento contínuo, sem botão de pausa nem interrupção ao passar o mouse ou focar pelo teclado. Para fora da tela e em abas ocultas; com movimento reduzido, a lista permite rolagem horizontal sem reprodução automática. O acesso ao painel tem destaque verde no header e atalho no celular.
- As seções explicam o fluxo, os diferenciais, a validação humana e o escopo do protótipo. Sem rótulos decorativos acima dos títulos, grades de fundo ou métricas comerciais inventadas.
- Os textos de apoio usam tamanho adequado à leitura, com foco visível, contraste e controles de toque de pelo menos 44px. O Lenis respeita movimento reduzido.

A landing page não altera o painel nem conecta sua demonstração local ao backend.

A raiz `/` mostra a LP sem sessão e o painel após a autenticação. Os botões de acesso levam a `/login`; login e cadastro retornam a `/` ou ao caso solicitado. Não há uma rota separada `/app` para o painel.

Recarregar a landing page volta ao topo e remove a seção da URL. Links diretos para seções continuam funcionando na primeira abertura.

Os títulos h1 e h2 usam GSAP SplitText, seguindo o movimento da referência Lime Ag: palavras no hero e linhas nas seções sobem de dentro de máscaras por linha, com entrada sequencial e desaceleração suave, uma vez ao entrar na tela. O texto original é restaurado ao terminar; movimento reduzido mantém os títulos estáticos. A medição aguarda as fontes e preserva as ênfases existentes.

A preparação dos títulos ocorre antes da primeira pintura para evitar que o texto apareça e suma antes da entrada. Se as fontes demorarem mais de dois segundos, os títulos aparecem sem animação.

As perguntas frequentes expandem e recolhem a resposta com GSAP, em 320 ms e 220 ms, com opacidade suave e rotação da seta. Cliques durante a transição invertem o movimento; teclado e movimento reduzido preservam a operação nativa de `details`/`summary`.
