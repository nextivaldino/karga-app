import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { EstadoCargaPendente } from '@/types';

export type FiltroEstadoCarga = EstadoCargaPendente | 'todas';
export type VistaCargas = 'lista' | 'grelha';

export const OPCOES_FILTRO_ESTADO: FiltroEstadoCarga[] = ['todas', 'pendente', 'importada', 'rejeitada'];

interface CargasToolbarContextValue {
  vista: VistaCargas;
  setVista: (v: VistaCargas) => void;
  filtro: FiltroEstadoCarga;
  setFiltro: (f: FiltroEstadoCarga) => void;
}

const CargasToolbarContext = createContext<CargasToolbarContextValue | null>(null);

// Vista/filtro da página Cargas — partilhados com a ilha dinâmica do
// cabeçalho (DynamicIsland.tsx), que desenha os controlos quando a página
// ativa é 'cargas'. Global em vez de local à página para a ilha (que vive
// no cabeçalho, fora da árvore de CargasPage) conseguir ler e escrever.
export function CargasToolbarProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [vista, setVista] = useState<VistaCargas>('lista');
  const [filtro, setFiltro] = useState<FiltroEstadoCarga>('todas');

  const value = useMemo<CargasToolbarContextValue>(
    () => ({ vista, setVista, filtro, setFiltro }),
    [vista, filtro],
  );

  return <CargasToolbarContext.Provider value={value}>{children}</CargasToolbarContext.Provider>;
}

export function useCargasToolbar(): CargasToolbarContextValue {
  const ctx = useContext(CargasToolbarContext);
  if (!ctx) throw new Error('useCargasToolbar deve ser usado dentro de CargasToolbarProvider');
  return ctx;
}
