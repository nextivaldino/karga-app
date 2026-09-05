import { CheckCircle as CheckCircle2, Info, Warning as TriangleAlert, XCircle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

type ToastTone = 'info' | 'success' | 'warning' | 'error';

interface ToastItem {
  id: string;
  tone: ToastTone;
  message: string;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener(toasts));
}

function push(tone: ToastTone, message: string): void {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, tone, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 4000);
}

export const toast = {
  info: (message: string) => push('info', message),
  success: (message: string) => push('success', message),
  warning: (message: string) => push('warning', message),
  error: (message: string) => push('error', message),
};

const toneIcon: Record<ToastTone, React.ComponentType<{ size?: number; className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: XCircle,
};

const toneColorClass: Record<ToastTone, string> = {
  info: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

// bottom-center (não bottom-right) — em ecrã pequeno um toast a um canto
// fica meio escondido ou sobrepõe controlos.
export function ToastContainer(): React.JSX.Element {
  const [items, setItems] = useState<ToastItem[]>(toasts);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+16px)] z-[100] flex flex-col items-center gap-2">
      {items.map((item) => {
        const Icon = toneIcon[item.tone];
        return (
          <div
            key={item.id}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-surface border border-border bg-bg-surface px-4 py-3 text-[14px] text-text-primary shadow-medium"
          >
            <Icon size={16} className={`shrink-0 ${toneColorClass[item.tone]}`} />
            {item.message}
          </div>
        );
      })}
    </div>
  );
}
