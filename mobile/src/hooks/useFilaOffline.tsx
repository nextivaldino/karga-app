import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { enviarCargasPendentes } from '@/lib/data';
import { adicionarAFila, listarFila, marcarErroNaFila, podeTentarAgora, removerDaFila } from '@/lib/offlineQueue';
import { classificarErro } from '@/lib/errorMessages';
import { toast } from '@/components/ui/Toast';
import type { ItemFilaOffline, NovaCargaPendenteInput } from '@/types';

interface FilaOfflineContextValue {
  fila: ItemFilaOffline[];
  aProcessar: boolean;
  enviarOuEnfileirar: (itens: NovaCargaPendenteInput[]) => Promise<'enviado' | 'offline' | 'erro_servidor'>;
  processarFila: () => Promise<void>;
  reenviarItem: (id: string) => Promise<void>;
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

  const tentarEnviarRegisto = useCallback(
    async (registo: ItemFilaOffline): Promise<boolean> => {
      if (!pwaUser) return false;
      try {
        await enviarCargasPendentes(pwaUser.id, pwaUser.postoId, [registo.item]);
        await removerDaFila(registo.id);
        return true;
      } catch (err) {
        const { mensagem, tipo } = classificarErro(err);
        await marcarErroNaFila(registo.id, mensagem, tipo);
        return false;
      }
    },
    [pwaUser],
  );

  // Só tenta o que faz sentido tentar sozinho: itens nunca tentados/à
  // espera de rede, e itens com erro transitório já fora da janela de
  // backoff. Erros permanentes ficam de fora — precisam de reenviarItem
  // explícito (ação do utilizador), nunca são retentados às cegas.
  const processarFila = useCallback(async () => {
    if (!pwaUser || aProcessar) return;
    const pendentes = await listarFila();
    if (pendentes.length === 0) return;

    const elegiveis = pendentes.filter(podeTentarAgora);
    const temPermanentes = pendentes.some((f) => f.estado === 'erro' && f.tipoErro === 'permanente');

    if (elegiveis.length === 0) {
      if (temPermanentes) {
        toast.warning('Há cargas na fila que precisam da tua atenção — revê em Cargas.');
      }
      return;
    }

    setAProcessar(true);
    let enviados = 0;
    let falhas = 0;
    for (const registo of elegiveis) {
      const ok = await tentarEnviarRegisto(registo);
      if (ok) enviados += 1;
      else falhas += 1;
    }
    await refrescar();
    setAProcessar(false);

    if (enviados > 0) {
      toast.success(`${enviados} carga${enviados === 1 ? '' : 's'} enviada${enviados === 1 ? '' : 's'} da fila.`);
    }
    if (falhas > 0) {
      toast.warning(`${falhas} carga${falhas === 1 ? '' : 's'} da fila continua${falhas === 1 ? '' : 'm'} com erro.`);
    }
  }, [pwaUser, aProcessar, refrescar, tentarEnviarRegisto]);

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
      } catch (err) {
        // Falha a meio (ex: rede caiu entre o navigator.onLine e o pedido
        // real) — não perde os dados, cai para a fila em vez de rebentar.
        // Se já se sabe que é permanente, marca logo assim — não faz
        // sentido a fila parecer "vai enviar sozinho" quando nunca vai.
        const { mensagem, tipo } = classificarErro(err);
        for (const item of itens) {
          const registo = await adicionarAFila(item);
          if (tipo === 'permanente') await marcarErroNaFila(registo.id, mensagem, tipo);
        }
        await refrescar();
        return 'erro_servidor';
      }
    },
    [pwaUser, refrescar],
  );

  // Força o reenvio de UM item específico, ignorando backoff/classificação
  // — ação explícita do utilizador (botão "Enviar" na própria linha),
  // diferente de processarFila que só mexe no que é seguro tentar sozinho.
  const reenviarItem = useCallback(
    async (id: string) => {
      const atual = await listarFila();
      const registo = atual.find((f) => f.id === id);
      if (!registo) return;
      setAProcessar(true);
      const ok = await tentarEnviarRegisto(registo);
      await refrescar();
      setAProcessar(false);
      if (ok) toast.success('Carga enviada.');
    },
    [refrescar, tentarEnviarRegisto],
  );

  const removerItem = useCallback(
    async (id: string) => {
      await removerDaFila(id);
      await refrescar();
    },
    [refrescar],
  );

  return (
    <FilaOfflineContext.Provider
      value={{ fila, aProcessar, enviarOuEnfileirar, processarFila, reenviarItem, removerItem }}
    >
      {children}
    </FilaOfflineContext.Provider>
  );
}

export function useFilaOffline(): FilaOfflineContextValue {
  const ctx = useContext(FilaOfflineContext);
  if (!ctx) throw new Error('useFilaOffline deve ser usado dentro de FilaOfflineProvider');
  return ctx;
}
