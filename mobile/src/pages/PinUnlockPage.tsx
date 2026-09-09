import { useState } from 'react';
import { LockKey } from '@phosphor-icons/react';
import { usePinLock } from '@/hooks/usePinLock';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/Toast';

// Ecrã de desbloqueio rápido — só aparece quando há sessão Supabase já
// válida e o utilizador configurou um PIN neste dispositivo (ver
// usePinLock.tsx). "Sair e usar password" é o escape hatch para quem
// esqueceu o PIN: um logout explícito limpa sempre o PIN local também.
export function PinUnlockPage(): React.JSX.Element {
  const { desbloquear } = usePinLock();
  const { logout, pwaUser } = useAuth();
  const [pin, setPin] = useState('');
  const [aVerificar, setAVerificar] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (pin.length < 4 || aVerificar) return;
    setAVerificar(true);
    const ok = await desbloquear(pin);
    setAVerificar(false);
    if (!ok) {
      toast.error('PIN incorreto.');
      setPin('');
    }
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-surface bg-primary/10 text-primary">
            <LockKey size={30} weight="duotone" />
          </span>
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-text-primary">
              Bem-vindo de volta{pwaUser ? `, ${pwaUser.nome}` : ''}
            </h1>
            <p className="text-[14px] text-text-tertiary">Introduz o teu PIN para continuar</p>
          </div>
        </div>

        <div className="card-surface flex w-full flex-col gap-3 p-5">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSubmit();
            }}
            placeholder="PIN"
            className="min-h-touch rounded-control border border-border bg-bg-input px-3 text-center text-[20px] tracking-[0.5em] text-text-primary outline-none focus:border-primary"
          />
          <button
            type="button"
            disabled={aVerificar || pin.length < 4}
            onClick={() => void handleSubmit()}
            className="btn-primary w-full disabled:opacity-60"
          >
            {aVerificar ? 'A verificar...' : 'Entrar'}
          </button>
        </div>

        <button type="button" onClick={() => void logout()} className="text-[13px] font-medium text-text-tertiary">
          Sair e usar password
        </button>
      </div>
    </div>
  );
}
