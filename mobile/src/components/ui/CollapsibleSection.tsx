import { useState } from 'react';
import { CaretDown as ChevronDown } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({ title, subtitle, defaultOpen = false, children }: CollapsibleSectionProps): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-surface border border-border bg-bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-touch w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex flex-col">
          <span className="text-[14px] font-medium text-text-primary">{title}</span>
          {subtitle ? <span className="text-[12px] text-text-tertiary">{subtitle}</span> : null}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? <div className="flex flex-col gap-3 border-t border-border p-4">{children}</div> : null}
    </div>
  );
}
