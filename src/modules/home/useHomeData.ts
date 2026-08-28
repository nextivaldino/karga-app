import { useCallback, useEffect, useState } from 'react';
import { ipcService } from '@/services/ipcService';
import type { CargaComEmissor, Contentor, HomeResumo } from '@/types';

interface HomeData {
  loading: boolean;
  resumo: HomeResumo | null;
  contentoresAtivos: Contentor[];
  ultimasCargas: CargaComEmissor[];
  moeda: string;
  refresh: () => void;
}

export function useHomeData(): HomeData {
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<HomeResumo | null>(null);
  const [contentoresAtivos, setContentoresAtivos] = useState<Contentor[]>([]);
  const [ultimasCargas, setUltimasCargas] = useState<CargaComEmissor[]>([]);
  const [moeda, setMoeda] = useState('EUR');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void Promise.all([
      ipcService.home.resumo(),
      ipcService.home.contentoresAtivos(),
      ipcService.home.ultimasCargas(),
      ipcService.settings.get('moeda_origem'),
    ]).then(([resumoData, ativos, ultimas, moedaSetting]) => {
      if (cancelled) return;
      setResumo(resumoData);
      setContentoresAtivos(ativos);
      setUltimasCargas(ultimas);
      setMoeda(moedaSetting ?? 'EUR');
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { loading, resumo, contentoresAtivos, ultimasCargas, moeda, refresh };
}
