import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { NovaCargaPendenteInput } from '@/types';

interface NovaCargaOverlayState {
  aberto: boolean;
  prefill: NovaCargaPendenteInput | null;
}

interface NovaCargaOverlayContextValue extends NovaCargaOverlayState {
  abrir: (prefill?: NovaCargaPendenteInput) => void;
  fechar: () => void;
}

const NovaCargaOverlayContext = createContext<NovaCargaOverlayContextValue | null>(null);

export function NovaCargaOverlayProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<NovaCargaOverlayState>({ aberto: false, prefill: null });

  const value = useMemo<NovaCargaOverlayContextValue>(
    () => ({
      ...state,
      abrir: (prefill) => setState({ aberto: true, prefill: prefill ?? null }),
      fechar: () => setState({ aberto: false, prefill: null }),
    }),
    [state],
  );

  return <NovaCargaOverlayContext.Provider value={value}>{children}</NovaCargaOverlayContext.Provider>;
}

export function useNovaCargaOverlay(): NovaCargaOverlayContextValue {
  const ctx = useContext(NovaCargaOverlayContext);
  if (!ctx) throw new Error('useNovaCargaOverlay deve ser usado dentro de NovaCargaOverlayProvider');
  return ctx;
}
