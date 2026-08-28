import { useCallback, useEffect, useState } from 'react';
import { ipcService } from '@/services/ipcService';
import type { ResumoCliente } from '@/types';

export function useFaturacao(contentorId: string | null) {
  const [escopoTodos, setEscopoTodos] = useState(false);
  const [soComDivida, setSoComDivida] = useState(true);
  const [clientes, setClientes] = useState<ResumoCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void ipcService.faturacao
      .resumoPorCliente({
        contentorId: escopoTodos ? undefined : (contentorId ?? undefined),
        soComDivida,
      })
      .then((items) => {
        if (cancelled) return;
        setClientes(items);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contentorId, escopoTodos, soComDivida, version]);

  return { clientes, loading, escopoTodos, setEscopoTodos, soComDivida, setSoComDivida, refresh };
}
