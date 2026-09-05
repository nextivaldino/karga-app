import { CaretRight as ChevronRight } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

export interface BoxedListRowProps {
  icon?: ReactNode;
  iconColorClass?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
}

export function BoxedList({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="card-surface overflow-hidden">{children}</div>;
}

export function BoxedListRow({ icon, iconColorClass, title, subtitle, trailing, onClick }: BoxedListRowProps): React.JSX.Element {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={`flex min-h-touch w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 ${
        onClick ? 'cursor-pointer active:bg-bg-app' : ''
      }`}
    >
      {icon ? <span className={`shrink-0 ${iconColorClass ?? 'text-text-secondary'}`}>{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-text-primary">{title}</span>
        {subtitle ? <span className="block text-[13px] text-text-tertiary">{subtitle}</span> : null}
      </span>
      {trailing ?? (onClick ? <ChevronRight size={18} className="shrink-0 text-text-tertiary" /> : null)}
    </Wrapper>
  );
}
