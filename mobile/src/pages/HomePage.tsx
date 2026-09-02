import { useEffect, useState } from 'react';
import { Bell, Clock, Euro, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { useTopBarSlot } from '@/hooks/useTopBarSlot';
import { listMinhasCargasPendentes, listMensagens } from '@/lib/data';
import { toast } from '@/components/ui/Toast';
import type { CargaPendente, Mensagem } from '@/types';

function formatMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor);
}

export function HomePage(): React.JSX.Element {
  const { pwaUser } = useAuth();
  const { navigate } = useNavigation();
  const [cargas, setCargas] = useState<CargaPendente[]>([]);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState<Mensagem[]>([]);
  const { fila } = useFilaOffline();
  const porEnviar = fila.length;

  useTopBarSlot(<span className="truncate text-[16px] font-semibold text-text-primary">Olá, {pwaUser?.nome ?? '...'} 👋</span>);

  useEffect(() => {
    let cancelado = false;
    Promise.all([listMinhasCargasPendentes(), listMensagens()])
      .then(([cs, ms]) => {
        if (cancelado) return;
        setCargas(cs);
        setMensagensNaoLidas(ms.filter((m) => !m.lida && m.paraUserId === pwaUser?.id));
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Falha ao carregar dados.'));
    return () => {
      cancelado = true;
    };
  }, [pwaUser?.id]);

  const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const cargasSemana = cargas.filter((c) => new Date(c.createdAt).getTime() >= seteDiasAtras).length;

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime();
  const valorMes = cargas
    .filter((c) => new Date(c.createdAt).getTime() >= inicioMes)
    .reduce((soma, c) => soma + (c.valor ?? 0), 0);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => navigate('cargas')}
          className="flex flex-col items-start gap-1 rounded-surface border border-border bg-bg-surface p-4 text-left active:bg-bg-app"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-success/10 text-success">
            <Package size={18} />
          </span>
          <span className="text-[22px] font-semibold text-text-primary">{cargasSemana}</span>
          <span className="text-[12px] text-text-tertiary">cargas/semana</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('cargas')}
          className="flex flex-col items-start gap-1 rounded-surface border border-border bg-bg-surface p-4 text-left active:bg-bg-app"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-primary/10 text-primary">
            <Euro size={18} />
          </span>
          <span className="text-[22px] font-semibold text-text-primary">{formatMoeda(valorMes)}</span>
          <span className="text-[12px] text-text-tertiary">este mês</span>
        </button>
      </div>

      {mensagensNaoLidas.length > 0 ? (
        <button
          type="button"
          onClick={() => navigate('mensagens')}
          className="flex min-h-touch items-center gap-3 rounded-surface border border-border bg-bg-surface p-4 text-left active:bg-bg-app"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-purple/10 text-purple">
            <Bell size={18} />
          </span>
          <span className="text-[14px] text-text-primary">
            {mensagensNaoLidas.length} mensagem{mensagensNaoLidas.length === 1 ? '' : 's'} nova{mensagensNaoLidas.length === 1 ? '' : 's'}
          </span>
        </button>
      ) : null}

      {porEnviar > 0 ? (
        <button
          type="button"
          onClick={() => navigate('cargas')}
          className="flex min-h-touch items-center gap-3 rounded-surface border border-warning/30 bg-warning/10 p-4 text-left"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-warning/20 text-warning">
            <Clock size={18} />
          </span>
          <span className="text-[14px] text-text-primary">
            {porEnviar} carga{porEnviar === 1 ? '' : 's'} por enviar
          </span>
        </button>
      ) : null}
    </div>
  );
}
