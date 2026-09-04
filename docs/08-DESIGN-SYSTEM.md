# 08 — Design System — Kraga Desktop (v2, estilo GNOME/Adwaita autêntico)

## Objetivo
Interface fiel ao GNOME 50 / libadwaita — seguindo os padrões nomeados da HIG oficial
(developer.gnome.org/hig): Header Bars, Boxed Lists, View Switchers, Popovers,
Utility Panes, Toasts/Banners.

---

## 1. Ícones
- Biblioteca: `@phosphor-icons/react` (substituiu `lucide-react` — mesma família em
  todo o projeto, Desktop e Mobile). Importar sempre de `@phosphor-icons/react`;
  usar `as` para manter nomes locais quando o ícone real do Phosphor tem outro
  nome (ex: `Boat as Ship`, `Gear as Settings`).
- **Estratégia de pesos (weight) — usar com intenção, não tudo a "regular"**:
  - **Ações neutras da UI** (fechar, editar, pesquisar, setas, menus, ícones
    dentro de botões pequenos): peso **regular** (o default do Phosphor — não
    passar `weight`), monocromático via `currentColor`, herdando a cor de texto
    do contexto. Mesma lógica que já tínhamos com o lucide-react.
  - **Identidade de módulo e destaque** (ícones nas abas do topo, cards de
    resumo na Home, cards de contentor na vista Ícones, categorias da Boxed
    List em Configurações, ícone principal no ecrã de Login): peso **duotone**,
    com a cor do módulo passada via prop `color` — ver `ModuleIcon`
    (`src/components/icons/ModuleIcon.tsx`) para o mapa central ícone+cor por
    módulo (Home azul, Cargas âmbar, Contentores verde, Configurações roxo,
    Faturação teal, Sincronização laranja, Dispositivos rosa, Kraga azul).
  - **Estados** (badges de contentor aberto/trânsito/fechado/bloqueado, toggle
    pago/devido, notificações): peso **fill** — mais "preenchido" para reforçar
    visualmente que é um estado definitivo/ativo.
- Tamanhos: 18px (UI geral), 24px (headers de página), 16px (dentro de badges).

## 2. Regra global obrigatória: Floating Label
Todos os inputs de texto/número/select usam label dentro da caixa, que sobe e
encolhe quando o campo é focado/preenchido:

```
Vazio:      ┌─────────────────────┐        Preenchido: ┌─────────────────────┐
            │ Nome da carga       │                     │ Nome da carga        │
            └─────────────────────┘                     │ Tambor azul          │
                                                          └─────────────────────┘
```

Componente único: `src/components/ui/FloatingLabelInput.tsx` — usado por TODOS os
formulários, sem exceção (inclui `<select>` e `<textarea>`).

Aceita um prop opcional `icon?: ReactNode` (ícone à esquerda, dentro da caixa,
16px, `text-text-tertiary`) — usar com moderação, só em formulários curtos onde
o ícone ajuda a reconhecer o campo de relance (Login, Setup, Contactos, dados
da Empresa). Não é para aplicar indiscriminadamente a todos os campos da app.

## 3. Paleta de cores (tokens GNOME/Adwaita reais)

```css
:root[data-theme="light"] {
  --color-primary: #3584e4;
  --color-primary-hover: #1c71d8;
  --color-primary-light: #eaf2fc;
  --color-success: #2ec27e;
  --color-error: #e01b24;
  --color-warning: #e5a50a;
  --color-purple: #9141ac;

  --bg-app: #f6f5f4;
  --bg-surface: #ffffff;
  --bg-header: rgba(255,255,255,0.8);
  --bg-input: #ffffff;

  --text-primary: #241f31;
  --text-secondary: #5e5c64;
  --text-tertiary: #9a9996;
  --border: #deddda;
}

:root[data-theme="dark"] {
  --color-primary: #78aeed;
  --color-success: #57e389;
  --color-error: #ff7b63;
  --color-warning: #f8e45c;
  --color-purple: #c061cb;

  --bg-app: #1e1e1e;
  --bg-surface: #2d2d2d;
  --bg-header: rgba(36,31,49,0.8);
  --bg-input: #363636;

  --text-primary: #ffffff;
  --text-secondary: #c0bfbc;
  --text-tertiary: #77767b;
  --border: rgba(255,255,255,0.1);
}
```

## 4. Header Bar (GNOME real)
- Altura 48px, fundo translúcido com `backdrop-filter: blur(12px)` sobre `--bg-header`.
- Três zonas: esquerda (título/voltar), centro (abas/view switcher), direita
  (ações/menu/pesquisa).
- Popups usam a mesma Header Bar, versão compacta (40px), com controlos
  incorporados (ex: seletor de contêiner no popup de Nova Carga).

## 4b. Abas de navegação (estilo Chrome autêntico)

As 4 abas de topo (`src/components/layout/MainTabs.tsx`) seguem a silhueta e o
comportamento reais das abas do Google Chrome, não um estilo "inspirado":

- **Silhueta**: cantos arredondados só no topo (`rounded-t-[10px]`), cantos
  retos em baixo. A aba ativa ganha ainda a "rampa" côncava na base — duas
  `radial-gradient` coladas fora da caixa da aba, nos cantos inferiores
  (componente `TabFlare`), que pintam um quarto de círculo com a cor da aba a
  invadir a barra à volta antes de encontrar `--bg-header`. É este detalhe que
  dá a silhueta trapezoidal/arredondada característica do Chrome.
- **Fusão da aba ativa com o conteúdo**: a aba ativa usa exatamente a mesma
  cor do `ContextToolbar` da página por baixo — `var(--toolbar-bg)`, plana e
  igual em todas as páginas (abandonámos a tinta por módulo/página que havia
  antes) — zero borda/sombra na transição. Páginas sem `ContextToolbar` (ex:
  Home) usam `var(--bg-app)` diretamente, a cor de base real por trás de
  qualquer fundo decorativo. A identidade de módulo continua só nos ícones
  (colorido/duotone), não no fundo da barra.
- **Abas inativas**: fundo de repouso permanente `var(--toolbar-hover)`
  (distinto do `--bg-header` translúcido da barra e da cor cheia da ativa),
  reforçado para `var(--bg-app)` no hover.
- **Layout**: ícone colorido por página + label, sem botão de fechar (abas
  fixas, não fecháveis).
- **Colapsar para só-ícone**: cada aba expandida mostra, só no hover, um
  pequeno chevron sobreposto (não ocupa espaço no layout normal, evita
  obrigar a aba a ficar mais larga) que a colapsa para ~44px (só ícone).
  Clicar numa aba colapsada expande-a de volta e navega, se ainda não for a
  página ativa. Um clique normal na aba nunca é ambíguo com esta ação — não
  há double-click nem delay a atrasar a troca de página.
- **Ícone da app**: antes do título "Kraga Desktop" no `AppShell`, o ícone de
  marca `ModuleIcon module="kraga"` (Phosphor `Boat`, duotone, azul).

Próximos módulos que adicionem novas abas de topo devem seguir esta mesma
receita (fusão de cor com o conteúdo, tom de repouso via `--toolbar-hover`,
colapso por hover) em vez de reinventar um padrão de Header Bar genérico.

## 4c. Métricas de chrome e gramática do toolbar de página (inspirado no Finder)

- **Tokens de altura** (`src/styles/theme.css`): `--chrome-header-h: 48px`
  (Header Bar/abas), `--chrome-toolbar-h: 42px` (`ContextToolbar` de ação —
  mais fina que o header, tal como no Finder a toolbar é mais baixa que a
  title bar), `--chrome-icon-btn: 32px` (todos os botões-ícone do cabeçalho:
  pesquisa, tema, sinos, sair). Usar sempre estes tokens em vez de números
  soltos (`h-8`, `h-[50px]`, etc.) em qualquer chrome novo.
- **Gramática do `ContextToolbar` de cada página**, da esquerda para a
  direita, sempre pela mesma ordem: `[Ação primária] → [Pesquisa] →
  [Vista/densidade] → [Seletor de contexto + filtros] → [Toggle secundário,
  à direita]`. Ver `Cargas.tsx` e `Contentores.tsx` como referência.
- **`Breadcrumb`** (`src/components/layout/Breadcrumb.tsx`): trilha clicável
  estilo path bar do Finder (`Definições › Contentores e Códigos`) — usar em
  vez de qualquer link de texto solto tipo "‹ Voltar" sempre que uma página
  tiver um nível de "drill-in". Quando a secção também precisa de um
  toolbar de ações próprio (ex: Contactos), o `Breadcrumb` vive numa
  `ContextToolbar` com `variant="breadcrumb"` (barra fina, `bg-bg-app`, sem
  sombra) por cima da `ContextToolbar` de ações normal — duas barras
  empilhadas, tal como o Finder separa a toolbar da path bar.
- **`IconBadgeButton`** (`src/components/layout/IconBadgeButton.tsx`): casca
  partilhada para botões-ícone do cabeçalho com badge numérico (sinos de
  notificações/sincronização). Qualquer bell novo deve nascer a partir
  deste componente, não reimplementar o badge.
- **Barra de estado sensível à página**: `useStatusBarText(texto)`
  (`src/hooks/useStatusBarText.tsx`) publica um resumo contextual na
  `StatusBar` do fundo da janela (ex: "22 cargas", "4 contentores") — estilo
  Finder ("12 items, 340 KB disponíveis"). Chamar com `null` esconde o
  resumo e volta ao texto por omissão (nome + versão da app).

## 5. Boxed Lists (usado em Configurações)
- Linhas dentro de um card único, radius 12px, separador fino entre linhas.
- Cada linha: ícone colorido à esquerda, título + subtítulo opcional, chevron `›`
  (navegável) ou controlo direto (switch/valor) à direita.

## 6. View Switcher (usado em Contentores)
- Par de botões pill agrupados (`Lista | Ícones`), fundo `--bg-input`, item ativo
  com fundo `--bg-surface` + sombra leve.

## 6b. Select Menu — substitui o `<select>` nativo
`src/components/ui/SelectMenu.tsx` — **proibido usar `<select>` nativo do
navegador** para escolhas de uma lista (ex: escolher contêiner). O menu
nativo abre com o tema do SO (aparece escuro fora de contexto) e pode abrir
para cima quando perto do fundo da janela — quebra a fidelidade visual e a
previsibilidade. `SelectMenu` reaproveita o `ContextMenu` (mesmo popover
usado nos menus de contexto): botão-gatilho a mostrar o valor atual +
chevron, popover sempre por baixo, com o visual e tema do resto da app.

## 7. Grelha estilo Excel (Modo Editor de Cargas)
- Exceção deliberada às formas arredondadas do resto do sistema: cantos **retos**
  (`border-radius: 0`), `border-collapse`, linhas/colunas finas, zebra striping leve.
- Único componente que quebra a linguagem "arredondada" GNOME — intencional.

## 8. Espaçamento e radius
```css
--spacing-xs: 4px; --spacing-sm: 8px; --spacing-md: 12px; --spacing-lg: 16px; --spacing-xl: 24px;
--radius-control: 8px; --radius-surface: 12px; --radius-pill: 999px;
```

## 9. Tipografia
- Fonte: **Inter** (self-hosted). Escala: 11/12/14/16/20/24px.
- Labels/cabeçalhos de tabela: maiúsculas, tracking largo, semibold, `--text-tertiary`.

## 10. Toasts / Banners / Dialogs
- **Toast**: canto inferior direito, auto-dismiss 4s (ex: "Carga guardada").
- **Banner**: fixo no topo da página, avisos persistentes (ex: "Contentor bloqueado").
- **Dialog**: confirmação de ações destrutivas/sensíveis, `tone: danger|warning|default`.

## 11. Modais e profundidade de sombra
- **Um único componente de modal**: `src/components/ui/HeaderBarModal.tsx` — X
  para fechar + título centrado (`title` aceita `ReactNode`, não só texto — o
  `GlobalSearch`, por exemplo, usa a própria barra de pesquisa como título) +
  corpo com scroll + rodapé opcional. Proibido montar outro overlay/portal do
  zero para um popup.
  - **Exceção intencional**: `ContentorPreviewPanel.tsx` é um painel deslizante
    lateral (estilo Quick Look do Finder), não um popup centrado — mantém-se
    fora do `HeaderBarModal` de propósito, para não perder o contexto da lista
    por trás enquanto se espreita um contentor.
- **Peso de sombra por tipo de elemento flutuante** — três níveis, não usar
  `shadow-2xl` em tudo:
  - `shadow-lg`: elementos transitórios e leves (`Toast`, `ContextMenu`).
  - `shadow-2xl`: `HeaderBarModal` — o único elemento que bloqueia a
    interação com o resto da app merece a sombra mais pesada.

---

## Critério de "pronto"
- [ ] `FloatingLabelInput` usado em 100% dos formulários
- [ ] Paleta `light`/`dark` via `data-theme`
- [ ] Header Bar translúcida com blur, reutilizada em janela principal e popups
- [ ] Boxed List pronto para Configurações
- [ ] View Switcher pronto para Contentores
- [ ] Grelha Excel com cantos retos, isolada visualmente
