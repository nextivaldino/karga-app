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
}

export function HeaderBarModal({
  open,
  onClose,
  title,
  headerRight,
  footer,
  children,
  widthClassName = 'max-w-[560px]',
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
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-bg-header px-3 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
          >
            <X size={16} />
          </button>
          <div className="flex-1 text-center text-[13px] font-medium text-text-primary">{title}</div>
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
