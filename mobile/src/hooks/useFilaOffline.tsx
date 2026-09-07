import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { enviarCargasPendentes } from '@/lib/data';
import { adicionarAFila, listarFila, marcarErroNaFila, removerDaFila } from '@/lib/offlineQueue';
import { mensagemErroAmigavel } from '@/lib/errorMessages';
import { toast } from '@/components/ui/Toast';
import type { ItemFilaOffline, NovaCargaPendenteInput } from '@/types';

interface FilaOfflineContextValue {
  fila: ItemFilaOffline[];
  aProcessar: boolean;
  enviarOuEnfileirar: (itens: NovaCargaPendenteInput[]) => Promise<'enviado' | 'offline' | 'erro_servidor'>;
  processarFila: () => Promise<void>;
  removerItem: (id: string) => Promise<void>;
}

const FilaOfflineContext = createContext<FilaOfflineContextValue | null>(null);

export function FilaOfflineProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { pwaUser } = useAuth();
  const [fila, setFila] = useState<ItemFilaOffline[]>([]);
  const [aProcessar, setAProcessar] = useState(false);

  const refrescar = useCallback(async () => {
    setFila(await listarFila());
  }, []);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  const processarFila = useCallback(async () => {
    if (!pwaUser || aProcessar) return;
    const pendentes = await listarFila();
    if (pendentes.length === 0) return;

    setAProcessar(true);
    let enviados = 0;
    let falhas = 0;
    for (const registo of pendentes) {
      try {
        await enviarCargasPendentes(pwaUser.id, pwaUser.postoId, [registo.item]);
        await removerDaFila(registo.id);
        enviados += 1;
      } catch (err) {
        await marcarErroNaFila(registo.id, mensagemErroAmigavel(err));
        falhas += 1;
      }
    }
    await refrescar();
    setAProcessar(false);

    if (enviados > 0) {
      toast.success(`${enviados} carga${enviados === 1 ? '' : 's'} enviada${enviados === 1 ? '' : 's'} da fila.`);
    }
    if (falhas > 0) {
      toast.warning(`${falhas} carga${falhas === 1 ? '' : 's'} da fila continua${falhas === 1 ? '' : 'm'} com erro.`);
    }
  }, [pwaUser, aProcessar, refrescar]);

  // Ao recuperar ligação, tenta esvaziar a fila automaticamente.
  useEffect(() => {
    function onOnline(): void {
      void processarFila();
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [processarFila]);

  const enviarOuEnfileirar = useCallback(
    async (itens: NovaCargaPendenteInput[]): Promise<'enviado' | 'offline' | 'erro_servidor'> => {
      if (!pwaUser) throw new Error('Sessão inválida.');

      if (!navigator.onLine) {
        for (const item of itens) await adicionarAFila(item);
        await refrescar();
        return 'offline';
      }

      try {
        await enviarCargasPendentes(pwaUser.id, pwaUser.postoId, itens);
        return 'enviado';
      } catch {
        // Falha a meio (ex: rede caiu entre o navigator.onLine e o pedido
        // real) — não perde os dados, cai para a fila em vez de rebentar.
        for (const item of itens) await adicionarAFila(item);
        await refrescar();
        return 'erro_servidor';
      }
    },
    [pwaUser, refrescar],
  );

  const removerItem = useCallback(
    async (id: string) => {
      await removerDaFila(id);
      await refrescar();
    },
    [refrescar],
  );

  return (
    <FilaOfflineContext.Provider value={{ fila, aProcessar, enviarOuEnfileirar, processarFila, removerItem }}>
      {children}
    </FilaOfflineContext.Provider>
  );
}

export function useFilaOffline(): FilaOfflineContextValue {
  const ctx = useContext(FilaOfflineContext);
  if (!ctx) throw new Error('useFilaOffline deve ser usado dentro de FilaOfflineProvider');
  return ctx;
}
