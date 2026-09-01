import { useEffect, useState } from 'react';
import { MessageCircle, Package, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';
import { listContentoresDisponiveis, listMensagens } from '@/lib/data';
import { BoxedList, BoxedListRow } from '@/components/ui/BoxedList';
import { toast } from '@/components/ui/Toast';
import type { ContentorDisponivel, Mensagem } from '@/types';

export function HomePage(): React.JSX.Element {
  const { pwaUser } = useAuth();
  const { navigate } = useNavigation();
  const { abrir } = useNovaCargaOverlay();
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
      <button
        type="button"
        onClick={() => abrir()}
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
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {contentores.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="flex w-36 shrink-0 flex-col items-start gap-2 rounded-surface border border-border bg-bg-surface p-4"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-control bg-primary/10 text-primary">
                  <Package size={20} />
                </span>
                <span className="text-[15px] font-medium text-text-primary">{c.codigo}</span>
                <span className="w-full truncate text-[13px] text-text-tertiary">{c.nome}</span>
              </div>
            ))}
          </div>
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
