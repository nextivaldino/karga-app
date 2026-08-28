import type { ReactNode } from 'react';

export interface ViewSwitcherOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface ViewSwitcherProps<T extends string> {
  value: T;
  options: ViewSwitcherOption<T>[];
  onChange: (value: T) => void;
}

export function ViewSwitcher<T extends string>({ value, options, onChange }: ViewSwitcherProps<T>): React.JSX.Element {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-control bg-bg-input p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
            value === option.value
              ? 'bg-primary/10 text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
