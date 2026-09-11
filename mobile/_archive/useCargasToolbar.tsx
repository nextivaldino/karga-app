import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { listContentoresDisponiveis, listMinhasCargasPendentes } from '@/lib/data';
import { toast } from '@/components/ui/Toast';
import type { CargaPendente, ContentorDisponivel, EstadoCargaPendente } from '@/types';

export type FiltroEstadoCarga = EstadoCargaPendente | 'todas';

export const OPCOES_FILTRO_ESTADO: FiltroEstadoCarga[] = ['todas', 'pendente', 'importada', 'rejeitada'];

interface CargasToolbarContextValue {
  filtro: FiltroEstadoCarga;
  setFiltro: (f: FiltroEstadoCarga) => void;
  // Dados partilhados entre CargasPage e SubBar (ambas precisam da
  // mesma lista de contentores/cargas — centralizado aqui para não
  // duplicar pedidos ao servidor entre as duas).
  contentores: ContentorDisponivel[];
  cargas: CargaPendente[];
  loading: boolean;
  recarregar: () => Promise<void>;
  // Sinal leve de "algo mudou, vale a pena recarregar" — incrementado por
  // quem grava uma carga (NovaCargaOverlay) fora da árvore de CargasPage.
  bumpRefresh: () => void;
}

const CargasToolbarContext = createContext<CargasToolbarContextValue | null>(null);

export function CargasToolbarProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [filtro, setFiltro] = useState<FiltroEstadoCarga>('todas');
  const [contentores, setContentores] = useState<ContentorDisponivel[]>([]);
  const [cargas, setCargas] = useState<CargaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const recarregar = useCallback(async () => {
    try {
      const [cs, cgs] = await Promise.all([listContentoresDisponiveis(), listMinhasCargasPendentes()]);
      setContentores(cs);
      setCargas(cgs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao carregar dados.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void recarregar().finally(() => setLoading(false));
  }, [refreshTick, recarregar]);

  const bumpRefresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  const value = useMemo<CargasToolbarContextValue>(
    () => ({ filtro, setFiltro, contentores, cargas, loading, recarregar, bumpRefresh }),
    [filtro, contentores, cargas, loading, recarregar, bumpRefresh],
  );

  return <CargasToolbarContext.Provider value={value}>{children}</CargasToolbarContext.Provider>;
}

export function useCargasToolbar(): CargasToolbarContextValue {
  const ctx = useContext(CargasToolbarContext);
  if (!ctx) throw new Error('useCargasToolbar deve ser usado dentro de CargasToolbarProvider');
  return ctx;
}
