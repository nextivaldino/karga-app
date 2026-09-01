import { useState } from 'react';
import { KeyRound, X } from 'lucide-react';

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
    <div className="flex items-center gap-3 border-b border-border bg-warning/10 px-4 py-2.5">
      <KeyRound size={16} className="shrink-0 text-warning" />
      <p className="flex-1 text-[13px] text-text-primary">Recomendamos alterar a password padrão.</p>
      <button type="button" onClick={onAlterar} className="shrink-0 text-[13px] font-medium text-primary">
        Alterar agora
      </button>
      <button type="button" onClick={dispensar} className="shrink-0 p-1 text-text-tertiary">
        <X size={16} />
      </button>
    </div>
  );
}
