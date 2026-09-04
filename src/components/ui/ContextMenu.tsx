import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

const VIEWPORT_MARGIN = 8;

export interface ContextMenuItem {
  key: string;
  label?: string;
  header?: string;
  divider?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

interface ContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ open, x, y, items, onClose }: ContextMenuProps): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null);
  // Nasce escondido na posição pedida (x, y) e só fica visível depois de
  // medido — se o botão que o abriu estiver perto do fim da janela, a
  // segunda passagem desloca-o para dentro em vez de deixá-lo cortado.
  const [pos, setPos] = useState<{ top: number; left: number; ready: boolean }>({ top: y, left: x, ready: false });

  useLayoutEffect(() => {
    if (!open) {
      setPos({ top: y, left: x, ready: false });
      return;
    }
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.min(x, Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.width - VIEWPORT_MARGIN));
    const top = Math.min(y, Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.height - VIEWPORT_MARGIN));
    setPos({ top, left, ready: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, x, y, items.length]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={ref}
      style={{ top: pos.top, left: pos.left, visibility: pos.ready ? 'visible' : 'hidden' }}
      className="fixed z-50 min-w-[180px] overflow-hidden rounded-control border border-border bg-bg-surface py-1 shadow-lg"
    >
      {items.map((item) => {
        if (item.divider) return <div key={item.key} className="my-1 h-px bg-border" />;
        if (item.header) {
          return (
            <div
              key={item.key}
              className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary"
            >
              {item.header}
            </div>
          );
        }
        return (
          <button
            key={item.key}
            type="button"
            disabled={item.disabled}
            title={item.disabled ? item.disabledReason : undefined}
            onClick={() => {
              if (item.disabled) return;
              item.onClick?.();
              onClose();
            }}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors ${
              item.disabled
                ? 'cursor-not-allowed text-text-tertiary opacity-50'
                : item.danger
                  ? 'text-error hover:bg-error/10'
                  : 'text-text-primary hover:bg-bg-app'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
