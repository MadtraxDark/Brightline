# Instruções para mensagens de commit

Gere uma única mensagem de commit em português do Brasil, profissional, objetiva e tecnicamente precisa. Responda somente com a mensagem pronta para uso, sem aspas, explicações ou bloco de código.

Analise todo o diff disponível (arquivos adicionados, modificados e removidos) e o contexto do repositório. Primeiro identifique a capacidade ou comportamento principal que foi adicionado, corrigido ou alterado; depois considere refatorações, remoções e limpeza como mudanças secundárias. O cabeçalho deve descrever o objetivo principal e seu efeito para o usuário ou sistema. Não resuma um commit funcional como simples limpeza, remoção de código ou manutenção.

## Formato e nível de detalhe

Use Conventional Commits:

- `tipo(escopo): resumo` (escopo opcional)
- `tipo(escopo)!: resumo` para mudanças incompatíveis

Escolha o tipo pelo propósito principal: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci`, `chore` ou `revert`. Use `feat` para funcionalidade nova e `fix` para corrigir comportamento incorreto. Não classifique automaticamente mudanças de configuração ou dependências como `chore`; considere o efeito real.

Para qualquer mudança funcional, alteração em mais de um arquivo ou mudança que atravesse frontend, backend e documentação, escreva um corpo detalhado com 3 a 6 itens. Não entregue só o cabeçalho nesses casos. Explique as capacidades adicionadas, como o fluxo funciona, validações e tratamento de erros, impactos observáveis, documentação e limitações relevantes, quando estiverem presentes no diff. Cada item deve trazer informação concreta; agrupe por intenção e não faça uma lista arquivo por arquivo. Para mudanças realmente triviais em um único arquivo, o corpo pode ser omitido.

Exemplo de nível de detalhe esperado para uma funcionalidade que adiciona classificação de radiografias:

feat(radiografias): adiciona classificação exploratória de imagens

- Cria uma tela para autenticar, selecionar uma radiografia e consultar as probabilidades das 14 classes do modelo NIH
- Adiciona uma rota protegida que valida formato e tamanho da imagem e executa a inferência sem persistir o arquivo
- Apresenta probabilidades, corte exploratório, versão do modelo e aviso de revisão profissional
- Documenta a chamada da API e esclarece que o resultado é experimental e não constitui diagnóstico

Use o exemplo apenas como referência de estrutura e detalhe. Nunca copie fatos dele se o diff não os comprovar.

Use um escopo curto quando o componente afetado estiver claro. O resumo deve começar com um verbo de ação, explicar a mudança principal, ficar abaixo de 72 caracteres sempre que possível e não terminar com ponto. Evite resumos vagos e emojis.

Não invente comportamento, motivação, requisitos, testes executados, resultados ou informações ausentes. Mencione testes alterados quando isso fizer parte do diff, mas nunca afirme que testes foram executados ou passaram sem evidência. Para breaking changes, acrescente `BREAKING CHANGE:` e descreva o impacto somente quando puder ser determinado pelo diff.

Consulte commits recentes para manter consistência de escopos, formato e nível de detalhe, sem copiar seu conteúdo nem repetir padrões que conflitem com estas regras. Não inclua issues, tickets, autores, coautores ou revisores.
