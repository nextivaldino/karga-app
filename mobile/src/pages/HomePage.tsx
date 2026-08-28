import { useEffect, useState } from 'react';
import { MessageCircle, Package, Plus, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';
import { listContentoresDisponiveis, listMensagens } from '@/lib/data';
import { BoxedList, BoxedListRow } from '@/components/ui/BoxedList';
import { toast } from '@/components/ui/Toast';
import type { ContentorDisponivel, Mensagem } from '@/types';

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    function onOnline(): void {
      setOnline(true);
    }
    function onOffline(): void {
      setOnline(false);
    }
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);
  return online;
}

export function HomePage(): React.JSX.Element {
  const { pwaUser } = useAuth();
  const { navigate } = useNavigation();
  const online = useOnlineStatus();
  const [contentores, setContentores] = useState<ContentorDisponivel[]>([]);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    Promise.all([listContentoresDisponiveis(), listMensagens()])
      .then(([cs, ms]) => {
        if (cancelado) return;
        setContentores(cs);
        setMensagensNaoLidas(ms.filter((m) => !m.lida && m.paraUserId === pwaUser?.id).slice(0, 3));
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Falha ao carregar dados.'))
      .finally(() => setLoading(false));
    return () => {
      cancelado = true;
    };
  }, [pwaUser?.id]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold text-text-primary">Olá, {pwaUser?.nome ?? '...'}</h1>
        <span
          className={`flex items-center gap-1 rounded-pill px-2.5 py-1 text-[12px] font-medium ${
            online ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
          }`}
        >
          {online ? <Wifi size={14} /> : <WifiOff size={14} />}
          {online ? 'Online' : 'Sem ligação'}
        </span>
      </div>

      <button
        type="button"
        onClick={() => navigate('cargas')}
        className="flex min-h-touch items-center justify-center gap-2 rounded-control bg-primary text-[16px] font-medium text-white active:bg-primary-hover"
      >
        <Plus size={20} /> Nova Carga
      </button>

      <section className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Contentores Disponíveis</h2>
        {loading ? (
          <p className="text-[14px] text-text-tertiary">A carregar...</p>
        ) : contentores.length === 0 ? (
          <p className="text-[14px] text-text-tertiary">Nenhum contentor disponível de momento.</p>
        ) : (
          <BoxedList>
            {contentores.map((c) => (
              <BoxedListRow
                key={c.id}
                icon={<Package size={18} />}
                iconColorClass="text-primary"
                title={c.codigo}
                subtitle={c.nome}
                onClick={() => navigate('contentores', { contentorId: c.id })}
              />
            ))}
          </BoxedList>
        )}
      </section>

      {mensagensNaoLidas.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Mensagens</h2>
          <BoxedList>
            {mensagensNaoLidas.map((m) => (
              <BoxedListRow
                key={m.id}
                icon={<MessageCircle size={18} />}
                iconColorClass="text-purple"
                title={m.texto}
                onClick={() => navigate('mensagens')}
              />
            ))}
          </BoxedList>
        </section>
      ) : null}
    </div>
  );
}
