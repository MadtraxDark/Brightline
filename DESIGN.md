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

## Barras de rolagem
Padrão obrigatório para todas as páginas e regiões roláveis: barra de 10px com indicador arredondado e margem interna de 2px em navegadores WebKit/Blink, cinza azulado e realce mais escuro no hover. Firefox usa a versão nativa fina com as mesmas cores. Aplicar por CSS global usando tokens `--scrollbar-*`, incluindo tabelas e painéis. Superfícies escuras sobrescrevem os tokens locais. Dispositivos de toque mantêm a apresentação nativa; alto contraste usa cores do sistema. Não esconder rolagem necessária nem reintroduzir rolagem horizontal na lateral.

## Tipografia e layout
Interface em Atkinson Hyperlegible Next; laudo em Source Serif 4, até 70ch. Página com margens de 40px no desktop, 24px em telas intermediárias e 16px no celular. Abaixo de 700px, navegação lateral vira navegação superior; tabela conserva laudo e prioridade, e informações completas ficam no detalhe. Controles principais de toque com pelo menos 44px. Bordas discretas e sem sombras decorativas; sombra apenas no painel flutuante de simulação.

## Referências
A imagem SaaS fornecida pelo usuário governa a composição atual. Impeccable orienta clareza, estados e organização; Web Design Guidelines orienta acessibilidade; Playwright CLI verifica o fluxo. A referência Cal.com em docs/design-references é secundária.

## Login
A rota /login usa duas áreas no desktop: apresentação da marca em azul-marinho e formulário em superfície branca. Abaixo de 801px, a marca vira um cabeçalho compacto e o formulário ocupa a largura disponível. Campos e botão têm 50px de altura; o controle de senha tem alvo de 44px. Mensagens de validação aparecem junto aos campos, com foco no primeiro erro, e são removidas ao editar. O acesso continua demonstrativo, com validação e redirecionamento definidos em src/lib/session.js. Não há recuperação de senha ou cadastro fictícios. A nota de demonstração explica os dados sintéticos e o tratamento das credenciais.

## Cadastro
A rota /cadastro compartilha o layout de acesso e inclui nome, e-mail, senha com pelo menos 8 caracteres e confirmação. Links conectam cadastro e login, preservando o destino originalmente solicitado. A validação foca o primeiro campo inválido e anuncia o erro. O envio inicia a sessão demonstrativa existente; não cria conta persistente nem armazena dados pessoais. Esse comportamento está explícito na interface. O fluxo foi verificado em desktop, tablet e celular com scripts/verify-registration.js.

## Navegação lateral
Navegação principal em um único grupo: Visão geral, Não sinalizados e Avaliação da IA. Ícones com mesmo tamanho e peso, contador alinhado à direita e seleção pelo fundo. Logo separada do menu por uma linha discreta. Demonstração usa disclosure nativo, fechado inicialmente; seus controles mantêm avanço e confirmação de reset. Sair fica no rodapé com ícone. Em telas até 700px, um botão de menu controla a navegação; selecionar um destino recolhe o menu. Rodapé e demonstração também ficam acessíveis no celular. Fluxo verificado com scripts/verify-sidebar.js.

## Menu de perfil e configurações
O avatar no lado direito do cabeçalho abre um menu com Configurações e Sair. Sair foi removido da barra lateral. O menu aceita setas, Home, End, Tab e Escape, restaura foco ao fechar com Escape e fecha com clique fora. A rota /configuracoes permite escolher/remover imagem JPG, PNG ou WebP de até 2 MB e editar o nome exibido. Avatar padrão usa um ícone neutro; nenhuma identidade fictícia é atribuída. Preferências são salvas apenas no sessionStorage do navegador e removidas ao sair; não há upload ao servidor. Erros de armazenamento são informados. Fluxo e layouts verificados em scripts/verify-profile.js.

## Continuidade da navegação
A seleção se recolhe horizontalmente para a área principal em 150ms; muda de linha somente enquanto oculta; depois reabre na nova seção em 220ms. A rota muda imediatamente. Um único contorno SVG substitui as curvas de sombra e mantém o encaixe contínuo. Cliques rápidos cancelam a animação anterior a partir da posição visual atual. Redimensionar a janela e ativar movimento reduzido posicionam o indicador diretamente. Configurações recolhe o destaque sem selecionar outro destino. Menu mobile reabre alinhado, sem animar dentro do menu oculto. Verificação em scripts/verify-navigation-motion.js; demonstração em artifacts/ui/sidebar-merge-animation.webm.
