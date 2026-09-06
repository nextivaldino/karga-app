import type { ReactNode } from 'react';

interface ContextToolbarProps {
  children: ReactNode;
  /**
   * "action" (default) — barra de ferramentas cheia, com ações da página.
   * "breadcrumb" — path bar fina e discreta ao estilo Finder, usada só
   * para mostrar "onde estás" (ex: Definições › Contentores) por cima de
   * uma segunda `ContextToolbar` de ações, quando a secção tem as duas.
   */
  variant?: 'action' | 'breadcrumb';
  // Só a página Sync usa isto — quando a aba "Sync" fica amarela (há
  // cargas pendentes), a barra tem de ficar exatamente da mesma cor para
  // fundir sem emenda com o "flare" da aba (ver MainTabs.tsx). Sem prop,
  // mantém-se sempre var(--toolbar-bg), como todas as outras páginas.
  style?: React.CSSProperties;
}

// Cor única e padrão para todas as sub-barras — abandonámos a
// tintagem por página (cada módulo tinha a sua cor de acento aqui);
// agora é sempre `--toolbar-bg` simples, igual em Cargas, Contentores
// e Definições. A identidade de módulo continua a viver só nos ícones
// (colorido/duotone), não no fundo da barra.
export function ContextToolbar({ children, variant = 'action', style }: ContextToolbarProps): React.JSX.Element {
  if (variant === 'breadcrumb') {
    return (
      <div className="relative flex h-9 shrink-0 items-center gap-3 border-b border-border bg-bg-app px-lg">
        {children}
      </div>
    );
  }
  return (
    <div
      className="relative flex min-h-[var(--chrome-toolbar-h)] shrink-0 items-center gap-3 border-b border-border/50 bg-[var(--toolbar-bg)] px-lg py-1.5"
      style={style}
    >
      {children}
    </div>
  );
}
