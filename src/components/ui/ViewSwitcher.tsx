import type { ReactNode } from 'react';

export interface ViewSwitcherOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  title?: string;
  // Contagem opcional (ex: nº de cargas) — mostrada como bolinha junto ao
  // ícone, sempre visível mesmo quando a etiqueta colapsa em janelas
  // estreitas (é um elemento irmão, não fica dentro do <span> escondido).
  badge?: number;
}

interface ViewSwitcherProps<T extends string> {
  value: T;
  options: ViewSwitcherOption<T>[];
  onChange: (value: T) => void;
}

export function ViewSwitcher<T extends string>({ value, options, onChange }: ViewSwitcherProps<T>): React.JSX.Element {
  return (
    <div className="inline-flex h-9 items-center gap-0.5 rounded-control bg-bg-input p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          title={option.title ?? option.label}
          className={`flex h-8 items-center justify-center gap-1.5 rounded-[6px] px-2 text-[13px] font-medium transition-colors lg:px-3 ${
            value === option.value
              ? 'bg-primary/10 text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {option.icon}
          <span className="hidden lg:inline">{option.label}</span>
          {option.badge != null && option.badge > 0 ? (
            <span
              className={`flex h-4 min-w-4 items-center justify-center rounded-pill px-1 text-[10px] font-semibold ${
                value === option.value ? 'bg-primary/15 text-primary' : 'bg-text-tertiary/15 text-text-tertiary'
              }`}
            >
              {option.badge > 99 ? '99+' : option.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
