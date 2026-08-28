import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

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
      style={{ top: y, left: x }}
      className="fixed z-50 min-w-[180px] overflow-hidden rounded-control border border-border bg-bg-surface py-1 shadow-2xl"
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
