import { useEffect, useState } from 'react';
import { ipcService } from '@/services/ipcService';
import type { CargaComEmissor, Contentor, EstadoPagamento } from '@/types';

const ULTIMO_CONTENTOR_KEY = 'ultimo_contentor_ativo';

export function useCargasPage() {
  const [contentoresAbertos, setContentoresAbertos] = useState<Contentor[]>([]);
  const [selectedContentorId, setSelectedContentorId] = useState<string | null>(null);
  const [loadingContentores, setLoadingContentores] = useState(true);

  const [cargas, setCargas] = useState<CargaComEmissor[]>([]);
  const [loadingCargas, setLoadingCargas] = useState(false);
  const [estadoPagamento, setEstadoPagamento] = useState<EstadoPagamento | undefined>(undefined);
  const [origemPwaUserId, setOrigemPwaUserId] = useState<string | undefined>(undefined);
  const [cargasVersion, setCargasVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([ipcService.contentores.list({ estado: 'aberto' }), ipcService.settings.get(ULTIMO_CONTENTOR_KEY)]).then(
      ([abertos, savedId]) => {
        if (cancelled) return;
        setContentoresAbertos(abertos);
        const initial = abertos.find((c) => c.id === savedId) ?? abertos[0] ?? null;
        setSelectedContentorId(initial?.id ?? null);
        setLoadingContentores(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  function selectContentor(id: string): void {
    setSelectedContentorId(id);
    void ipcService.settings.set(ULTIMO_CONTENTOR_KEY, id);
  }

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

  const selectedContentor = contentoresAbertos.find((c) => c.id === selectedContentorId) ?? null;

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
