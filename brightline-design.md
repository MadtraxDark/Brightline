# Brightline: regras de design (v2)

Fonte da verdade do visual. **Substitui qualquer versão anterior deste arquivo.** O que o Bruno desenhou (sidebar azul-marinho com logo, barra superior, cartões, tabela, aba conectada) é a base do projeto. Estas regras descrevem e protegem esse desenho: **não redesenhe nada que já existe** a menos que o pedido diga isso.

Se algo não estiver aqui, escolha a opção mais simples e neutra. Não invente estilo novo por componente.

## Conceito

A interface é neutra. Três coisas emitem sinal:

1. **Urgência = cor.** Vermelho, laranja e azul existem para Crítico, Urgente e Acionável, e para mais nada.
2. **Evidência no laudo = luminosidade.** O trecho que a IA usou aparece como bloco escuro com texto claro, como uma região hiperintensa numa imagem.
3. **Ação primária = preenchimento escuro.** Poucos elementos preenchidos, só onde há ação a tomar.

Não existe cor de marca além do azul-marinho da sidebar e do amarelo do logo, que ficam onde estão.

## Estrutura atual da aplicação

- **Sidebar** azul-marinho (`--sidebar-bg`), com logo, seções, aba branca conectada ao conteúdo, contagens, cartão "Próximo prazo", botão de recolher e rodapé "IA sugere. Você valida."
- **Barra superior:** breadcrumb à esquerda; à direita, o relógio "Demo · +Nh" e o menu do avatar.
- **Conteúdo:** Visão geral, Detalhe do caso, Não sinalizados, Avaliação da IA.
- **Luna:** botão flutuante no canto inferior direito (placeholder da futura IA).
- **Login e cadastro** sem sidebar, barra superior nem Luna.

## Proibido

- Gráficos, rosca, barras e séries temporais. Não temos dados temporais reais.
- Roxo, verde ou qualquer outra cor de marca. Gradientes decorativos.
- Sombra decorativa. **Única exceção:** a sombra suave da Luna, que separa um elemento flutuante do conteúdo.
- Caixa alta em rótulos. Fonte monoespaçada em rótulos.
- Bibliotecas além de `react`, `react-dom`, `react-router-dom`, `lucide-react` e `@fontsource/*`.
- Cor escrita direto no componente (hex, rgb). Use variáveis de `tokens.css`.
- Mostrar a Luna como se respondesse. Ela ainda não responde.
- Inventar dado clínico ou valor de referência. Tudo vem dos arquivos de dados.

## Tokens (`src/styles/tokens.css`)

Valores do tema claro. Confira o arquivo para os valores atuais antes de alterar qualquer um.

```css
--bg: #f1f4f7;
--panel: #ffffff;
--border: #d5dce3;
--border-strong: #8a96a3;
--text: #161b20;
--text-muted: #5a6673;

--critical: #b71c1c;
--critical-tint: #fdecec;
--urgent: #9e4d00;
--urgent-tint: #fff1e0;
--actionable: #1f5fbf;
--actionable-tint: #e8f0fd;

--evidence-bg: #12161b;
--evidence-text: #f2f6f9;
--action-bg: #161b20;
--action-text: #ffffff;

--radius-panel: 8px;
--radius-control: 6px;
--radius-badge: 4px;
--radius-mark: 2px;
--s1: 4px;
--s2: 8px;
--s3: 12px;
--s4: 16px;
--s5: 24px;
--s6: 32px;
```

**Sobre o azul-marinho da sidebar (`#021837`)**, use só estas cores de urgência, que passam de 4,5:1:

```css
--on-dark-critical: #ff5a5f; /* 5,8:1 */
--on-dark-urgent: #ffa94d; /* 9,3:1 */
--on-dark-actionable: #6fa8f7; /* 7,3:1 */
```

As cores de urgência do tema claro dão só 2,7 a 3,0:1 sobre o azul-marinho: **não as use dentro da sidebar**.

Contrastes conferidos no tema claro: texto 15,7:1 sobre `--bg`; `--text-muted` 5,3:1; `--critical` 6,0:1; `--urgent` 5,4:1; `--actionable` 5,5:1; `--critical` sobre `--critical-tint` 5,75:1; `--panel` sobre `--critical` 6,57:1; `--panel` sobre `--action-bg` 17,33:1. Mínimo de 4,5:1 para qualquer texto. Se mudar uma cor, recalcule.

## Tipografia

- **Interface:** Atkinson Hyperlegible Next (400, 500, 700), fallback `system-ui, sans-serif`.
- **Corpo do laudo:** Source Serif 4 (400), fallback `Georgia, serif`, entrelinha 1.65, `max-width: 70ch`.
- Escala: 13px (apoio), 15px (corpo), 18px (títulos de seção), 28px (números dos cartões). Sem caixa alta.
- Fontes vêm de `@fontsource` (funcionam offline).

## Urgência: nunca só cor

| Valor        | Rótulo    | Cor            | Ícone           |
| ------------ | --------- | -------------- | --------------- |
| `critical`   | Crítico   | `--critical`   | `TriangleAlert` |
| `urgent`     | Urgente   | `--urgent`     | `Clock`         |
| `actionable` | Acionável | `--actionable` | `CalendarClock` |

Selo único `UrgencyBadge`: ícone, rótulo, texto na cor do nível, fundo `--*-tint`, borda de 1px. Além disso, "Sem alerta" é neutro (ícone `FileCheck`) e sempre acompanhado de "Não é liberação clínica": **nunca** chame de "aprovado" ou "normal".

## Peso visual

1. **Ação primária = preenchido escuro** (`--action-bg`, texto `--panel`). No máximo um por área da tela.
2. **Selecionado = preenchido escuro.** Não selecionado: fundo `--bg`, sem contorno.
3. **Contorno só em campos de digitação** (borda `--border-strong`) e em cartões de conteúdo.
4. **Preenchimento colorido só para urgência, concentrado no mais urgente.** Crítico usa `--critical-tint`; **atrasado** usa `--critical` sólido com texto `--panel`. Urgente e Acionável ficam neutros nos preenchimentos (só ícone e selo levam a cor).
5. Conjuntos de opções são um controle segmentado, não caixas soltas com contorno.

## Densidade de texto

1. Uma ideia por linha; sem frases explicativas na tela de trabalho.
2. A mesma informação em um só lugar.
3. Zero não é informação: não mostrar "0 atrasados", "0 resolvidos" nem chip com contagem 0.
4. O estado normal não leva rótulo; só o desvio ganha texto.
5. Texto de ajuda só onde há risco de interpretação errada.

## Componentes

- **Visão geral:** botão preenchido "Abrir próximo · tempo" no topo; quatro cartões (Críticos, Urgentes, Acionáveis, Sem alerta) com ícone, número e uma palavra; só Crítico com casos abertos usa fundo `--critical-tint`; "N atrasados" só se for maior que zero. Cada cartão filtra a lista e o filtro vive na URL (`?prioridade=`).
- **Lista:** colunas Prazo, Achado, Responsável e seta. Prazo em pílula (atrasado: `--critical` sólido; crítico no prazo: `--critical-tint`; urgente e acionável: só texto). A regra do prazo aparece uma vez, no cabeçalho do grupo. Só o grupo Crítico tem cabeçalho colorido.
- **Linha de Não sinalizados:** mostra "Não sinalizado" com `EyeOff`. É a rede de segurança do produto, não esconda.
- **Detalhe do caso:** laudo em serifa com `<mark class="evidence">`, painel "Comunicação" com o caminho de escalonamento, linha do tempo e ações.
- **Relógio:** "Demo · +Nh" na barra superior; +1h, +6h, +24h e "Resetar demo" com confirmação em dois passos. É ferramenta de demonstração, não função clínica.
- **Cartão "Próximo prazo" (sidebar):** tempo em destaque, nome do achado e, se escalado, "Escalado · nível N".
- **Luna:** botão flutuante 56×56, 24px das bordas, painel provisório com "Em breve". Sem rede, sem armazenamento, sem resposta fingida.

## Sidebar: regras que não podem quebrar

- A aba branca do item ativo é **um único elemento que se move**. Trocar de item anima (recolhe, troca a linha, reabre) e respeita `prefers-reduced-motion`.
- A borda direita da aba fica de 0 a 1px além da borda da sidebar e **nenhum ancestral pode cortá-la** (nada de `overflow` não visível em `.sidebar`, `.sidebar-body`, `.sidebar-scroll`). Para texto cortado ao recolher, aplique `overflow: hidden` nos próprios rótulos.
- Sem rolagem interna: abaixo de 700px de altura, o **modo compacto** esconde rótulos de seção e reduz a altura dos itens.
- O item ativo é a Visão geral na rota dela, com ou sem `?prioridade=`; o atalho de prioridade selecionado só ganha fundo discreto e `aria-current="true"`.
- Recolhida: ícones, selo de contagem e os atalhos de prioridade como ícone com contagem.

## Regras de trabalho para o Cursor

- Toda chamada de dados passa por `src/api.js`; componentes leem com `useStore` e selectors estáveis (nunca devolver array ou objeto novo de dentro do selector do hook).
- Não mude nomes de campos, estados nem endpoints. Contratos de dados: `reports.json`, `extractions_cache.json`, `evaluation.json` (calculado por `npm run evaluate:data`).
- Lógica nova em função pura com teste `node:test`, dentro do script `"test"`.
- Não altere engine nem `store.js` sem aviso.
- Depois de cada tela, rode o app e confira em 1280×720 e em **1280×620** (área útil de um projetor com a barra do navegador). Nada pode cortar ou rolar a página inteira por causa de sidebar ou Luna.
- Teclado: tudo operável, foco sempre visível.
- Ao terminar, diga o que NÃO conferiu visualmente.

## Antes de dar uma tela por pronta

- [ ] Nenhuma cor escrita direto; só variáveis de `tokens.css`.
- [ ] Vermelho, laranja e azul só em urgência.
- [ ] Todo selo de urgência tem ícone e rótulo escrito.
- [ ] Só um botão preenchido escuro por área.
- [ ] Nenhum "0 atrasados", "0 resolvidos" nem chip com 0.
- [ ] Nenhum gráfico, nenhuma cor de marca nova.
- [ ] Contraste mínimo de 4,5:1 em texto novo.
- [ ] Cabe em 1280×620 sem cortar.

Transição de página: 240ms, só em resposta à navegação, desativada com prefers-reduced-motion.
