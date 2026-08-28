import type { ReactNode } from 'react';
import { useNavigation } from '@/hooks/useNavigation';
import type { MainPage } from '@/types';

interface ContextToolbarProps {
  children: ReactNode;
}

const PAGE_ACCENT: Record<MainPage, string> = {
  home: 'var(--color-primary)',
  cargas: 'var(--color-warning)',
  contentores: 'var(--color-success)',
  configuracoes: 'var(--color-purple)',
};

export function ContextToolbar({ children }: ContextToolbarProps): React.JSX.Element {
  const { page } = useNavigation();

  return (
    <div
      className="flex h-[50px] shrink-0 items-center gap-3 border-b border-border px-lg shadow-sm"
      style={{ backgroundColor: `color-mix(in srgb, ${PAGE_ACCENT[page]} 14%, var(--toolbar-bg))` }}
    >
      {children}
    </div>
  );
}
