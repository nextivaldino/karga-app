import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { listContentoresDisponiveis, listMinhasCargasPendentes } from '@/lib/data';
import { toast } from '@/components/ui/Toast';
import type { CargaPendente, ContentorDisponivel } from '@/types';

export type ModoCargasHub = 'cargas' | 'contactos';

interface CargasHubContextValue {
  contentores: ContentorDisponivel[];
  cargas: CargaPendente[];
  loading: boolean;
  recarregar: () => Promise<void>;
  // Sinal leve de "algo mudou" — incrementado por quem grava uma carga
  // fora da árvore da página (ex: AddCargaSheet), para a lista
  // recarregar sozinha sem depender de pull-to-refresh manual.
  bumpRefresh: () => void;
  // ISO da última busca com sucesso — alimenta o item "Sincronização" da
  // ilha dinâmica ("há 42 min").
  ultimaSincronizacao: string | null;
  modo: ModoCargasHub;
  setModo: (m: ModoCargasHub) => void;
  // Chave (nome normalizado) do contacto aberto no modo Contactos — null
  // = lista de contactos; definido = detalhe de um contacto.
  contactoSelecionado: string | null;
  selecionarContacto: (nome: string | null) => void;
}

const CargasHubContext = createContext<CargasHubContextValue | null>(null);

// Dados partilhados do hub de Cargas (docs/26) — contentores/cargas
// buscados uma só vez aqui (mesmas funções de lib/data.ts de sempre),
// consumidos por CargasHubPage, DynamicIslandMenu (contagem/sync) e
// pelas folhas (AddCargaSheet etc.) sem duplicar pedidos ao servidor.
export function CargasHubProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [contentores, setContentores] = useState<ContentorDisponivel[]>([]);
  const [cargas, setCargas] = useState<CargaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<string | null>(null);
  const [modo, setModo] = useState<ModoCargasHub>('cargas');
  const [contactoSelecionado, setContactoSelecionado] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [cs, cgs] = await Promise.all([listContentoresDisponiveis(), listMinhasCargasPendentes()]);
      setContentores(cs);
      setCargas(cgs);
      setUltimaSincronizacao(new Date().toISOString());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao carregar dados.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void recarregar().finally(() => setLoading(false));
  }, [refreshTick, recarregar]);

  const bumpRefresh = useCallback(() => setRefreshTick((t) => t + 1), []);
  const selecionarContacto = useCallback((nome: string | null) => setContactoSelecionado(nome), []);

  const value = useMemo<CargasHubContextValue>(
    () => ({
      contentores,
      cargas,
      loading,
      recarregar,
      bumpRefresh,
      ultimaSincronizacao,
      modo,
      setModo,
      contactoSelecionado,
      selecionarContacto,
    }),
    [contentores, cargas, loading, recarregar, bumpRefresh, ultimaSincronizacao, modo, contactoSelecionado, selecionarContacto],
  );

  return <CargasHubContext.Provider value={value}>{children}</CargasHubContext.Provider>;
}

export function useCargasHub(): CargasHubContextValue {
  const ctx = useContext(CargasHubContext);
  if (!ctx) throw new Error('useCargasHub deve ser usado dentro de CargasHubProvider');
  return ctx;
}
