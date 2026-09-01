import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ipcService } from '@/services/ipcService';
import { useNavigation } from '@/hooks/useNavigation';

export function SincronizacaoBell(): React.JSX.Element {
  const { navigate } = useNavigation();
  const [total, setTotal] = useState(0);

  async function carregar(): Promise<void> {
    const pendentes = await ipcService.sync.listPendentes();
    setTotal(pendentes.length);
  }

  useEffect(() => {
    void carregar();
    const interval = setInterval(() => void carregar(), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      type="button"
      onClick={() => navigate('configuracoes', { entidadeId: 'sync' })}
      title={total > 0 ? `${total} carga${total === 1 ? '' : 's'} pendente${total === 1 ? '' : 's'} de sincronização` : 'Sincronização'}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      className="relative flex h-8 w-8 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
    >
      <RefreshCw size={18} />
      {total > 0 ? (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-primary px-1 text-[9px] font-semibold text-white">
          {total > 9 ? '9+' : total}
        </span>
      ) : null}
    </button>
  );
}
