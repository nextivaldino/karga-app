import { useCallback, useEffect, useState } from 'react';
import { ipcService } from '@/services/ipcService';
import type { CargaComEmissor, HomeResumo, OrigemPwaLinha, PublicUser } from '@/types';

interface HomeData {
  loading: boolean;
  resumo: HomeResumo | null;
  ultimasSincronizadas: CargaComEmissor[];
  origensPwa: OrigemPwaLinha[];
  usuarios: PublicUser[];
  moeda: string;
  refresh: () => void;
}

// Cargas sincronizadas mudam a qualquer momento vindas da PWA, não só
// quando este posto importa algo — por isso a Home também repete a
// consulta sozinha de vez em quando, à parte do `refresh()` manual
// disparado logo após uma importação local.
const INTERVALO_ATUALIZACAO_MS = 30_000;

export function useHomeData(): HomeData {
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<HomeResumo | null>(null);
  const [ultimasSincronizadas, setUltimasSincronizadas] = useState<CargaComEmissor[]>([]);
  const [origensPwa, setOrigensPwa] = useState<OrigemPwaLinha[]>([]);
  const [usuarios, setUsuarios] = useState<PublicUser[]>([]);
  const [moeda, setMoeda] = useState('EUR');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    function carregar(mostrarLoading: boolean): void {
      if (mostrarLoading) setLoading(true);
      void Promise.all([
        ipcService.home.resumo(),
        ipcService.home.ultimasSincronizadas(),
        ipcService.settings.get('moeda_origem'),
        ipcService.cargas.listOrigensPwa(),
        ipcService.users.list(),
      ]).then(([resumoData, sincronizadas, moedaSetting, origens, listaUsuarios]) => {
        if (cancelled) return;
        setResumo(resumoData);
        setUltimasSincronizadas(sincronizadas);
        setMoeda(moedaSetting ?? 'EUR');
        setOrigensPwa(origens);
        setUsuarios(listaUsuarios);
        setLoading(false);
      });
    }

    carregar(true);
    const interval = setInterval(() => carregar(false), INTERVALO_ATUALIZACAO_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tick]);

  return { loading, resumo, ultimasSincronizadas, origensPwa, usuarios, moeda, refresh };
}
