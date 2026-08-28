interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

// Alvo de toque de 44×64px (o Switch do Desktop é 24×40px, pequeno demais
// para dedos — doc 17 exige alvos táteis ≥44px).
export function Switch({ checked, onChange, disabled, label }: SwitchProps): React.JSX.Element {
  return (
    <label className="inline-flex min-h-touch shrink-0 cursor-pointer items-center gap-3 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 grow-0 basis-14 rounded-pill border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'border-primary bg-primary' : 'border-border bg-bg-input'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-pill bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
      {label ? <span className="text-[15px] text-text-primary">{label}</span> : null}
    </label>
  );
}
