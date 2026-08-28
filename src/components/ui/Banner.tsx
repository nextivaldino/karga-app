import { TriangleAlert, X } from 'lucide-react';
import type { ReactNode } from 'react';

interface BannerProps {
  children: ReactNode;
  onDismiss?: () => void;
  tone?: 'warning' | 'error';
}

const toneClasses: Record<NonNullable<BannerProps['tone']>, string> = {
  warning: 'bg-warning/10 text-warning border-warning/30',
  error: 'bg-error/10 text-error border-error/30',
};

export function Banner({ children, onDismiss, tone = 'warning' }: BannerProps): React.JSX.Element {
  return (
    <div className={`flex items-center gap-2 border-b px-lg py-2 text-[13px] ${toneClasses[tone]}`}>
      <TriangleAlert size={16} className="shrink-0" />
      <span className="flex-1">{children}</span>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100">
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}
