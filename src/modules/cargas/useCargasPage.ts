import { useEffect, useState } from 'react';
import { ipcService } from '@/services/ipcService';
import { useContentorAtivo } from '@/hooks/useContentorAtivo';
import type { CargaComEmissor, EstadoPagamento } from '@/types';

export function useCargasPage() {
  const { contentoresAbertos, selectedContentorId, selectedContentor, selectContentor, loadingContentores } =
    useContentorAtivo();

  const [cargas, setCargas] = useState<CargaComEmissor[]>([]);
  const [loadingCargas, setLoadingCargas] = useState(false);
  const [estadoPagamento, setEstadoPagamento] = useState<EstadoPagamento | undefined>(undefined);
  const [origemPwaUserId, setOrigemPwaUserId] = useState<string | undefined>(undefined);
  const [cargasVersion, setCargasVersion] = useState(0);

  useEffect(() => {
    if (!selectedContentorId) {
      setCargas([]);
      return;
    }
    let cancelled = false;
    setLoadingCargas(true);
    const timeout = setTimeout(() => {
      void ipcService.cargas.list({ contentorId: selectedContentorId, estadoPagamento, origemPwaUserId }).then((items) => {
        if (cancelled) return;
        setCargas(items);
        setLoadingCargas(false);
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [selectedContentorId, estadoPagamento, origemPwaUserId, cargasVersion]);

  function refreshCargas(): void {
    setCargasVersion((v) => v + 1);
  }

  return {
    contentoresAbertos,
    selectedContentorId,
    selectedContentor,
    selectContentor,
    loadingContentores,
    cargas,
    loadingCargas,
    estadoPagamento,
    setEstadoPagamento,
    origemPwaUserId,
    setOrigemPwaUserId,
    refreshCargas,
  };
}
