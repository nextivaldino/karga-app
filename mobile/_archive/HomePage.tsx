import { useEffect, useState } from 'react';
import { Warning as AlertTriangle, CheckCircle as CheckCircle2, Clock, CurrencyEur as Euro, Package } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { listMinhasCargasPendentes } from '@/lib/data';
import { toast } from '@/components/ui/Toast';
import { PullToRefresh } from '@/components/PullToRefresh';
import type { CargaPendente } from '@/types';

function formatMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor);
}

export function HomePage(): React.JSX.Element {
  const { pwaUser } = useAuth();
  const { navigate } = useNavigation();
  const [cargas, setCargas] = useState<CargaPendente[]>([]);
  const { fila } = useFilaOffline();
  const naFila = fila.filter((f) => f.estado === 'fila').length;
  const comErro = fila.filter((f) => f.estado === 'erro').length;

  async function recarregar(): Promise<void> {
    try {
      setCargas(await listMinhasCargasPendentes());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao carregar dados.');
    }
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pwaUser?.id]);

  const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const cargasSemana = cargas.filter((c) => new Date(c.createdAt).getTime() >= seteDiasAtras).length;

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime();
  const valorMes = cargas
    .filter((c) => new Date(c.createdAt).getTime() >= inicioMes)
    .reduce((soma, c) => soma + (c.valor ?? 0), 0);

  return (
    <div className="flex h-full flex-col">
      <PullToRefresh onRefresh={recarregar} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-2.5">
          {/* Cartões brancos, ícone pequeno colorido (não fundo cheio) —
              mesma densidade de antes, sem blocos de cor. Ficou só com 2
              (cargas/semana, este mês) — o 3º (mensagens) saiu na 27f. */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => navigate('cargas')}
              className="flex flex-1 flex-col items-start gap-1.5 rounded-surface border border-border bg-bg-surface p-4 text-left transition-transform active:scale-[0.98]"
            >
              <Package size={18} className="text-warning" />
              <span className="text-[26px] font-bold leading-none tabular-nums text-text-primary">{cargasSemana}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">cargas/semana</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('cargas')}
              className="flex flex-1 flex-col items-start gap-1.5 rounded-surface border border-border bg-bg-surface p-4 text-left transition-transform active:scale-[0.98]"
            >
              <Euro size={18} className="text-primary" />
              <span className="w-full truncate text-[26px] font-bold leading-none tabular-nums text-text-primary">{formatMoeda(valorMes)}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">este mês</span>
            </button>
          </div>

          {naFila > 0 ? (
            <button
              type="button"
              onClick={() => navigate('cargas')}
              className="flex min-h-touch items-center gap-2.5 rounded-surface border border-border bg-bg-surface px-3 py-2.5 text-left"
            >
              <Clock size={16} className="shrink-0 text-warning" />
              <span className="text-[12.5px] font-medium text-text-primary">
                {naFila} carga{naFila === 1 ? '' : 's'} por enviar — vai{naFila === 1 ? '' : 'ão'} quando ficares online
              </span>
            </button>
          ) : null}

          {comErro > 0 ? (
            <button
              type="button"
              onClick={() => navigate('cargas')}
              className="flex min-h-touch items-center gap-2.5 rounded-surface border border-border bg-bg-surface px-3 py-2.5 text-left"
            >
              <AlertTriangle size={16} className="shrink-0 text-error" />
              <span className="text-[12.5px] font-medium text-error">
                {comErro} carga{comErro === 1 ? '' : 's'} com falha ao enviar — toca para tentar de novo
              </span>
            </button>
          ) : null}

          {naFila === 0 && comErro === 0 ? (
            <div className="flex items-center gap-2 rounded-surface border border-border bg-bg-surface px-3 py-2.5">
              <CheckCircle2 size={18} weight="fill" className="shrink-0 text-success" />
              <span className="text-[12.5px] font-medium text-text-primary">Tudo sincronizado</span>
            </div>
          ) : null}
        </div>
      </PullToRefresh>
    </div>
  );
}
