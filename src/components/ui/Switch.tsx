interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Switch({ checked, onChange, disabled, label }: SwitchProps): React.JSX.Element {
  return (
    <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-10 shrink-0 grow-0 basis-10 rounded-pill border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'border-primary bg-primary' : 'border-border bg-bg-input'
        }`}
      >
        <span
          className={`absolute left-0 top-0.5 h-5 w-5 rounded-pill bg-white shadow transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
      {label ? <span className="text-[14px] text-text-primary">{label}</span> : null}
    </label>
  );
}
