import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { NovaCargaPendenteInput } from '@/types';

export type EstadoNovaCargaOverlay = 'fechado' | 'aberto' | 'minimizado';

interface NovaCargaOverlayState {
  estado: EstadoNovaCargaOverlay;
  prefill: NovaCargaPendenteInput | null;
  // Incrementa só em abrir() — nunca em minimizar()/restaurar(). É o que
  // permite a NovaCargaOverlay.tsx distinguir "abriu de novo" (deve
  // limpar o formulário) de "voltou do estado minimizado" (deve
  // preservar form/lote, que continuam vivos no state local do
  // componente — ele nunca desmonta, só deixa de estar em 'aberto').
  aberturaId: number;
}

interface NovaCargaOverlayContextValue extends NovaCargaOverlayState {
  abrir: (prefill?: NovaCargaPendenteInput) => void;
  fechar: () => void;
  minimizar: () => void;
  restaurar: () => void;
}

const NovaCargaOverlayContext = createContext<NovaCargaOverlayContextValue | null>(null);

const ESTADO_INICIAL: NovaCargaOverlayState = { estado: 'fechado', prefill: null, aberturaId: 0 };

export function NovaCargaOverlayProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<NovaCargaOverlayState>(ESTADO_INICIAL);

  const value = useMemo<NovaCargaOverlayContextValue>(
    () => ({
      ...state,
      abrir: (prefill) => setState((s) => ({ estado: 'aberto', prefill: prefill ?? null, aberturaId: s.aberturaId + 1 })),
      fechar: () => setState(ESTADO_INICIAL),
      minimizar: () => setState((s) => ({ ...s, estado: 'minimizado' })),
      restaurar: () => setState((s) => ({ ...s, estado: 'aberto' })),
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
