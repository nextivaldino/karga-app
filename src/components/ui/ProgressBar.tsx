interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
}

export function ProgressBar({ value, max, label }: ProgressBarProps): React.JSX.Element {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? <p className="text-[13px] text-text-secondary">{label}</p> : null}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-2 w-full overflow-hidden rounded-pill bg-bg-input"
      >
        <div className="h-full rounded-pill bg-primary transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
