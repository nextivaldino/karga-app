import { useState } from 'react';
import { Key as KeyRound, X } from '@phosphor-icons/react';

const STORAGE_KEY = 'kraga_mobile_banner_password_dispensado';

interface PasswordBannerProps {
  onAlterar: () => void;
}

export function PasswordBanner({ onAlterar }: PasswordBannerProps): React.JSX.Element | null {
  const [dispensado, setDispensado] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');

  if (dispensado) return null;

  function dispensar(): void {
    localStorage.setItem(STORAGE_KEY, '1');
    setDispensado(true);
  }

  return (
    <div className="mx-4 mt-3 flex items-center gap-3 rounded-surface border border-warning/25 bg-warning/10 px-4 py-3 shadow-soft">
      <KeyRound size={16} className="shrink-0 text-warning" weight="duotone" />
      <p className="flex-1 text-[13px] text-text-primary">Recomendamos alterar a password padrão.</p>
      <button type="button" onClick={onAlterar} className="shrink-0 rounded-pill bg-primary px-3 py-1.5 text-[12px] font-semibold text-white">
        Alterar agora
      </button>
      <button type="button" onClick={dispensar} className="shrink-0 rounded-full p-1.5 text-text-tertiary active:bg-bg-app">
        <X size={16} />
      </button>
    </div>
  );
}
