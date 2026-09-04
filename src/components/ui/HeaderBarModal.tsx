import { X } from '@phosphor-icons/react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface HeaderBarModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  headerRight?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  widthClassName?: string;
  // Só para casos que precisam mesmo de destacar o cabeçalho com uma
  // identidade própria (ex: seletor de contêiner da Nova Carga, a
  // amarelo) — por omissão o cabeçalho continua igual em todos os
  // outros popups. `headerClassName` troca altura/espaçamento;
  // `headerStyle` troca a cor (`color` aqui é herdado pelo título e
  // pelo botão de fechar, que deixam de impor a sua cor por omissão).
  headerClassName?: string;
  headerStyle?: React.CSSProperties;
}

export function HeaderBarModal({
  open,
  onClose,
  title,
  headerRight,
  footer,
  children,
  widthClassName = 'max-w-[560px]',
  headerClassName,
  headerStyle,
}: HeaderBarModalProps): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div
        className={`flex max-h-[85vh] w-full ${widthClassName} flex-col overflow-hidden rounded-surface border border-border bg-bg-surface shadow-2xl`}
      >
        <div
          // `backdrop-blur-md` cria o seu próprio stacking context — sem
          // `relative z-10` aqui, qualquer dropdown aberto a partir do
          // `title` (ex: seletor de contentor da Nova Carga) pinta-se
          // ANTES do corpo do modal a seguir no DOM, ficando escondido
          // atrás dele (mesma causa-raiz já corrigida no cabeçalho
          // principal da app em `AppShell.tsx`).
          className={`relative z-10 flex shrink-0 items-center gap-2 border-b border-border backdrop-blur-md ${headerClassName ?? 'h-10 bg-bg-header px-3'}`}
          style={headerStyle}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-6 w-6 items-center justify-center rounded-control transition-colors ${headerStyle ? 'hover:bg-black/10' : 'text-text-secondary hover:bg-bg-app'}`}
          >
            <X size={16} />
          </button>
          <div className={`flex-1 text-center text-[13px] font-medium ${headerStyle ? '' : 'text-text-primary'}`}>{title}</div>
          <div className="flex items-center gap-1">{headerRight}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-lg">{children}</div>

        {footer ? (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-lg py-md">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
