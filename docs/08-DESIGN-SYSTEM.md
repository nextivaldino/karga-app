# 08 — Design System — Kraga Desktop (v2, estilo GNOME/Adwaita autêntico)

## Objetivo
Interface fiel ao GNOME 50 / libadwaita — seguindo os padrões nomeados da HIG oficial
(developer.gnome.org/hig): Header Bars, Boxed Lists, View Switchers, Popovers,
Utility Panes, Toasts/Banners.

---

## 1. Ícones
- Biblioteca: `lucide-react` (linha fina, 2px stroke — compatível com o estilo GNOME).
- **Dois tratamentos**:
  - **Monocromático** (`currentColor`) para ações neutras: fechar, editar, pesquisar,
    setas, menus.
  - **Colorido/duotone** para identidade de módulo e estado: Cargas (azul),
    Contentores (verde), Configurações (roxo), Faturação (âmbar); estados
    (Aberto=verde, Trânsito=azul, Fechado=cinza, Bloqueado=vermelho).
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

## 5. Boxed Lists (usado em Configurações)
- Linhas dentro de um card único, radius 12px, separador fino entre linhas.
- Cada linha: ícone colorido à esquerda, título + subtítulo opcional, chevron `›`
  (navegável) ou controlo direto (switch/valor) à direita.

## 6. View Switcher (usado em Contentores)
- Par de botões pill agrupados (`Lista | Ícones`), fundo `--bg-input`, item ativo
  com fundo `--bg-surface` + sombra leve.

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

---

## Critério de "pronto"
- [ ] `FloatingLabelInput` usado em 100% dos formulários
- [ ] Paleta `light`/`dark` via `data-theme`
- [ ] Header Bar translúcida com blur, reutilizada em janela principal e popups
- [ ] Boxed List pronto para Configurações
- [ ] View Switcher pronto para Contentores
- [ ] Grelha Excel com cantos retos, isolada visualmente
