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

export function ToastContainer(): React.JSX.Element {
  const [items, setItems] = useState<ToastItem[]>(toasts);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {items.map((item) => {
        const Icon = toneIcon[item.tone];
        return (
          <div
            key={item.id}
            className="pointer-events-auto flex items-center gap-2 rounded-control border border-border bg-bg-surface px-4 py-3 text-[13px] text-text-primary shadow-lg"
          >
            <Icon size={16} className={toneColorClass[item.tone]} />
            {item.message}
          </div>
        );
      })}
    </div>
  );
}
