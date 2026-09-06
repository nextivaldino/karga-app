Preciso de um redesign visual e estrutural de duas partes da interface do
Kraga Desktop. Antes de implementares, lê o código atual de `MainTabs`/
`AppShell` e do `ContextToolbar` da página Cargas, e mostra-me o teu plano
(ficheiros a alterar) para eu aprovar.

═══════════════════════════════════════════════════════════════
PARTE 1 — Abas do topo estilo Chrome (100% fiéis, não "inspiradas")
═══════════════════════════════════════════════════════════════

As 4 abas de topo (Home, Cargas, Contentores, Definições) devem replicar
EXATAMENTE a estrutura visual das abas do Google Chrome, não um estilo
"parecido". Características obrigatórias:

1. FORMA: cada aba tem cantos arredondados APENAS no topo (top-left e
   top-right), cantos retos em baixo — a mesma silhueta trapezoidal/
   arredondada característica do Chrome, não um pill nem um retângulo
   simples.

2. FUSÃO VISUAL DA ABA ATIVA: a aba selecionada tem exatamente a mesma cor
   de fundo que a área de conteúdo por baixo dela — a transição entre a
   aba ativa e o conteúdo da página deve ser invisível (sem borda, sem
   sombra a separar), dando a sensação de que a aba "é" a página.

3. ABAS INATIVAS: fundo num tom ligeiramente mais escuro/diferente do que
   a aba ativa e do que a área de conteúdo (tal como no Chrome, onde as
   abas não selecionadas se destacam da barra de fundo e da aba ativa).

4. LAYOUT DE CADA ABA: ícone pequeno à esquerda (o "favicon" da aba — usa
   o ícone colorido já definido para cada página no design system) + label
   de texto. Sem botão de fechar "✕" (estas abas são fixas, não fecháveis
   como as do browser).

5. ÍCONE DA APP ANTES DA BARRA DE ABAS: à esquerda de tudo, antes da
   primeira aba (ou antes do nome "Kraga Desktop", conforme o layout atual
   do AppShell), adiciona um ícone genérico de placeholder para a app
   (será substituído pelo ícone oficial depois — usa um ícone simples do
   lucide-react, ex: um pacote/caixa, só como marcador de posição).

6. COMPORTAMENTO DE COLAPSAR: cada aba pode ser colapsada para mostrar
   apenas o ícone (sem o texto), reduzindo a sua largura ao mínimo — ao
   clicar no ícone de uma aba já colapsada, ela expande de volta ao
   tamanho normal com o texto visível. Sugestão de interação: duplo-clique
   ou um pequeno botão/seta na própria aba para colapsar; um único clique
   simples continua a servir para navegar/selecionar a aba. Escolhe a
   interação que for mais intuitiva e sem conflito com a navegação normal,
   e explica a tua escolha no plano antes de implementares.

7. Mantém a paleta de cores GNOME/Adwaita já definida em
   `08-DESIGN-SYSTEM.md` — muda-se a FORMA e ESTRUTURA das abas para
   estilo Chrome, não a paleta de cores do resto do sistema.

Depois de implementares, atualiza `docs/08-DESIGN-SYSTEM.md` e/ou
`docs/09-ARQUITETURA-PAGINAS.md` com uma nota a documentar esta mudança de
padrão de abas (de Header Bar GNOME genérica para abas estilo Chrome),
para os próximos módulos seguirem o mesmo padrão.

═══════════════════════════════════════════════════════════════
PARTE 2 — Barra contextual da página Cargas, reformulada
═══════════════════════════════════════════════════════════════

A barra contextual (sub-barra) da página Cargas deve ser reorganizada da
esquerda para a direita, EXATAMENTE nesta ordem:

1. **[+ Nova Carga]** — primeiro botão, mais à esquerda de todos.

2. **Barra de pesquisa estilo omnibox do Chrome** — substitui o ícone de
   lupa isolado que existe hoje. Deve parecer a barra de endereço do
   Chrome: retângulo com cantos bem arredondados (quase pill, mas não
   totalmente), borda subtil, ícone de lupa pequeno dentro do campo à
   esquerda, placeholder de texto (ex: "Pesquisar cargas..."), sem
   ocupar a largura toda — um tamanho médio, expansível ao foco se fizer
   sentido visualmente.

3. **Seletor de estilo de visualização** — logo a seguir à barra de
   pesquisa. Usa o mesmo padrão `ViewSwitcher` já existente no design
   system (usado em Contentores) para alternar densidade/modo de
   visualização da lista de cargas.

4. **Seletor de Contêiner + Filtros** — agrupados a seguir ao seletor de
   visualização (mantém a funcionalidade atual do dropdown de contêiner e
   dos filtros, só reposicionados nesta nova ordem). O botão "👥 Contactos"
   fica agrupado aqui também, junto aos filtros.

5. **Lista / Faturação, reimaginados** — atualmente são dois botões de
   texto simples e pouco claros sobre o que cada modo faz. Redesenha como
   um controlo segmentado com ícone + label curto + eventualmente uma
   micro-descrição (ex: tooltip ou subtítulo pequeno) que deixe claro ao
   utilizador a diferença: "📋 Lista — gerir e ver cargas" vs.
   "💰 Faturação — controlar pagamentos". Mantém o comportamento (alterna
   o conteúdo principal da página), só melhora a clareza visual.

6. **Modo Editor** — o toggle fica no FIM de tudo, mais à direita.

Reorganiza o componente `ContextToolbar` (ou equivalente específico da
página Cargas) para refletir esta ordem exata. Mantém toda a
funcionalidade já existente (nada de regressões) — isto é puramente uma
reorganização visual e de clareza, não uma mudança de comportamento.

═══════════════════════════════════════════════════════════════

Depois de implementares as duas partes, tira um screenshot (via CDP) da
página Home (para veres as abas) e da página Cargas (para veres a nova
barra contextual) e descreve-me o resultado antes de eu confirmar.

═══════════════════════════════════════════════════════════════
ADENDA (2026-09-05) — ESTADO REAL DA IMPLEMENTAÇÃO
═══════════════════════════════════════════════════════════════

A Parte 2 deste documento foi implementada com desvios em relação ao
pedido original, os quais foram consolidados no código e assumidos como o padrão final:

1. A **pesquisa "omnibox"** não foi colocada na barra contextual da página 
   Cargas. Em vez disso, tornou-se um **campo de pesquisa global no 
   cabeçalho principal** da aplicação (acessível em todas as páginas).

2. A ordem atual e definitiva da barra da página Cargas (da esquerda para a direita) é:
   - **Seletor de Contentor + Filtros** (`ContainerPickerButton`)
   - **Sincronização / Sync Card** (ao centro)
   - **Seletor Lista / Faturação** (`ViewSwitcher` melhorado)
   - **[+ Nova Carga]** (alinhado à direita)
   - **Modo Editor** (toggle, no fim de tudo)

Este estado reflete as decisões de evolução da interface tomadas durante a 
construção do módulo de sincronização (Sync Hub). Deve ser considerado o spec 
atual, substituindo as regras literais da "PARTE 2" acima.
