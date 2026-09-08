import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { listContentoresDisponiveisComEstado } from '@/lib/data';
import { toast } from '@/components/ui/Toast';
import type { ContentorDisponivel } from '@/types';

// A cada quantos ms tenta ligar-se sozinho ao servidor enquanto estiver a
// mostrar a cópia em cache — não é só ao reconectar à rede: um servidor
// em baixo com net local OK também conta.
const INTERVALO_RETRY_MS = 20_000;

interface ContentorAtivoContextValue {
  contentores: ContentorDisponivel[];
  contentorAtivoId: string | null;
  ligado: boolean;
  aLigar: boolean;
  tentarLigar: () => Promise<void>;
  selecionarContentor: (id: string) => void;
}

const ContentorAtivoContext = createContext<ContentorAtivoContextValue | null>(null);

// Estado partilhado do "contentor ativo" da app — por omissão resolvido
// pelo servidor (atribuído pelo Admin > padrão global > primeiro aberto),
// mas o utilizador pode substituir essa escolha manualmente
// (selecionarContentor) quando há mais do que 1 contentor aberto — com
// vários contentores concorrentes em produção, adivinhar sempre 1 só
// deixava de chegar. A Home e a Nova Carga leem daqui para nunca
// divergirem entre si.
export function ContentorAtivoProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { pwaUser } = useAuth();
  const [contentores, setContentores] = useState<ContentorDisponivel[]>([]);
  const [contentorAtivoId, setContentorAtivoId] = useState<string | null>(null);
  const [contentorSelecionadoManual, setContentorSelecionadoManual] = useState<string | null>(null);
  const [ligado, setLigado] = useState(true);
  const [aLigar, setALigar] = useState(false);

  const tentarLigar = useCallback(async () => {
    setALigar(true);
    try {
      const { contentores: cs, ligado: ok } = await listContentoresDisponiveisComEstado();
      setContentores(cs);
      setLigado(ok);
      const manualAindaValido = contentorSelecionadoManual != null && cs.some((c) => c.id === contentorSelecionadoManual);
      const doProprioUser = pwaUser?.contentorPadraoId;
      setContentorAtivoId(
        manualAindaValido
          ? contentorSelecionadoManual
          : (cs.find((c) => c.id === doProprioUser)?.id ?? cs.find((c) => c.padraoGlobal)?.id ?? cs[0]?.id ?? null),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao carregar contentores.');
      setLigado(false);
    } finally {
      setALigar(false);
    }
  }, [pwaUser?.contentorPadraoId, contentorSelecionadoManual]);

  const selecionarContentor = useCallback((id: string) => {
    setContentorSelecionadoManual(id);
    setContentorAtivoId(id);
  }, []);

  useEffect(() => {
    void tentarLigar();
  }, [tentarLigar]);

  useEffect(() => {
    if (ligado) return;
    function onOnline(): void {
      void tentarLigar();
    }
    window.addEventListener('online', onOnline);
    const interval = setInterval(() => void tentarLigar(), INTERVALO_RETRY_MS);
    return () => {
      window.removeEventListener('online', onOnline);
      clearInterval(interval);
    };
  }, [ligado, tentarLigar]);

  const value = useMemo<ContentorAtivoContextValue>(
    () => ({ contentores, contentorAtivoId, ligado, aLigar, tentarLigar, selecionarContentor }),
    [contentores, contentorAtivoId, ligado, aLigar, tentarLigar, selecionarContentor],
  );

  return <ContentorAtivoContext.Provider value={value}>{children}</ContentorAtivoContext.Provider>;
}

export function useContentorAtivo(): ContentorAtivoContextValue {
  const ctx = useContext(ContentorAtivoContext);
  if (!ctx) throw new Error('useContentorAtivo deve ser usado dentro de ContentorAtivoProvider');
  return ctx;
}
