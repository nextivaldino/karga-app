import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { pinConfigurado, verificarPin } from '@/lib/pinLocal';

interface PinLockContextValue {
  bloqueado: boolean;
  desbloquear: (pin: string) => Promise<boolean>;
}

const PinLockContext = createContext<PinLockContextValue | null>(null);

// Só decide "bloqueado" uma vez, assim que há sessão — nesta primeira
// versão o PIN protege reabrir/recarregar a app, não deteção de
// inatividade/fundo (ver docs/25 §5, âmbito reduzido confirmado).
export function PinLockProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { session } = useAuth();
  const [bloqueado, setBloqueado] = useState(false);
  const [avaliado, setAvaliado] = useState(false);

  useEffect(() => {
    if (avaliado || !session) return;
    setBloqueado(pinConfigurado());
    setAvaliado(true);
  }, [session, avaliado]);

  async function desbloquear(pin: string): Promise<boolean> {
    const ok = await verificarPin(pin);
    if (ok) setBloqueado(false);
    return ok;
  }

  return <PinLockContext.Provider value={{ bloqueado, desbloquear }}>{children}</PinLockContext.Provider>;
}

export function usePinLock(): PinLockContextValue {
  const ctx = useContext(PinLockContext);
  if (!ctx) throw new Error('usePinLock deve ser usado dentro de PinLockProvider');
  return ctx;
}
