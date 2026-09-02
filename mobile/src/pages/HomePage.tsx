import { useEffect, useState } from 'react';
import { Bell, Clock, Euro, Package, Ship } from 'lucide-react';
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
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-6 py-10">
      {/* Decorativo — dois brilhos suaves atrás do conteúdo, só estética */}
      <div className="pointer-events-none absolute -top-10 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-success/10 blur-3xl" />

      <span className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Ship size={26} />
      </span>

      <div className="relative flex w-full max-w-[280px] flex-col gap-2.5">
        <div className="flex justify-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('cargas')}
            className="flex flex-1 flex-col items-center gap-1 rounded-surface border border-border bg-bg-surface px-3 py-3.5 text-center active:bg-bg-app"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-control bg-success/10 text-success">
              <Package size={16} />
            </span>
            <span className="text-[18px] font-semibold text-text-primary">{cargasSemana}</span>
            <span className="text-[11px] text-text-tertiary">cargas/semana</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('cargas')}
            className="flex flex-1 flex-col items-center gap-1 rounded-surface border border-border bg-bg-surface px-3 py-3.5 text-center active:bg-bg-app"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-control bg-primary/10 text-primary">
              <Euro size={16} />
            </span>
            <span className="text-[18px] font-semibold text-text-primary">{formatMoeda(valorMes)}</span>
            <span className="text-[11px] text-text-tertiary">este mês</span>
          </button>
        </div>

        {mensagensNaoLidas.length > 0 ? (
          <button
            type="button"
            onClick={() => navigate('mensagens')}
            className="flex min-h-touch items-center gap-3 rounded-surface border border-border bg-bg-surface px-4 py-2.5 text-left active:bg-bg-app"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-purple/10 text-purple">
              <Bell size={15} />
            </span>
            <span className="text-[13px] text-text-primary">
              {mensagensNaoLidas.length} mensagem{mensagensNaoLidas.length === 1 ? '' : 's'} nova{mensagensNaoLidas.length === 1 ? '' : 's'}
            </span>
          </button>
        ) : null}

        {porEnviar > 0 ? (
          <button
            type="button"
            onClick={() => navigate('cargas')}
            className="flex min-h-touch items-center gap-3 rounded-surface border border-warning/30 bg-warning/10 px-4 py-2.5 text-left"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-warning/20 text-warning">
              <Clock size={15} />
            </span>
            <span className="text-[13px] text-text-primary">
              {porEnviar} carga{porEnviar === 1 ? '' : 's'} por enviar
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
