import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Maximize2, Package, X } from 'lucide-react';
import { ipcService } from '@/services/ipcService';
import { useNavigation } from '@/hooks/useNavigation';
import { ESTADO_CONTENTOR_COLOR_CLASS, ESTADO_CONTENTOR_LABEL } from '@/constants/labels';
import { getUrgenciaTier, URGENCIA_PILL_CLASS } from '@/lib/contentorUrgencia';
import type { CargaComEmissor, Contentor } from '@/types';

interface ContentorPreviewPanelProps {
  open: boolean;
  onClose: () => void;
  contentorId: string | null;
  limiteDiasParado: number;
  onAbrirDetalhe: (contentorId: string) => void;
}

function formatData(iso: string | null): string {
  return iso ? new Intl.DateTimeFormat('pt-PT').format(new Date(iso)) : '—';
}

function formatValor(valor: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor);
}

export function ContentorPreviewPanel({
  open,
  onClose,
  contentorId,
  limiteDiasParado,
  onAbrirDetalhe,
}: ContentorPreviewPanelProps): React.JSX.Element | null {
  const { navigate } = useNavigation();
  const [contentor, setContentor] = useState<Contentor | null>(null);
  const [cargas, setCargas] = useState<CargaComEmissor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !contentorId) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([ipcService.contentores.obter(contentorId), ipcService.cargas.list({ contentorId })]).then(
      ([c, cs]) => {
        if (cancelled) return;
        setContentor(c);
        setCargas(cs);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, contentorId]);

  if (!open) return null;

  function handleVerCargas(): void {
    if (!contentorId) return;
    navigate('cargas', { contentorId });
    onClose();
  }

  const urgencia = contentor?.diasParado != null ? getUrgenciaTier(contentor.diasParado, limiteDiasParado) : null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed bottom-0 right-0 top-12 z-40 flex w-96 flex-col border-l border-border bg-bg-surface shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-lg py-3">
          <h2 className="flex items-center gap-2 truncate text-[14px] font-semibold text-text-primary">
            <Package size={18} className="shrink-0" />
            {contentor ? `${contentor.codigo} — ${contentor.nome}` : 'Contentor'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-lg">
          {loading || !contentor ? (
            <p className="text-[13px] text-text-tertiary">A carregar...</p>
          ) : (
            <div className="flex flex-col gap-lg">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`text-[12px] font-medium ${ESTADO_CONTENTOR_COLOR_CLASS[contentor.estado]}`}>
                  {ESTADO_CONTENTOR_LABEL[contentor.estado]}
                  {contentor.bloqueado ? ' 🔒' : ''}
                </span>
                {contentor.categoria ? (
                  <span className="rounded-pill border border-border px-2 py-0.5 text-[10px] text-text-secondary">
                    {contentor.categoria}
                  </span>
                ) : null}
                {urgencia && contentor.diasParado != null ? (
                  <span className={`rounded-pill px-2 py-0.5 text-[10px] ${URGENCIA_PILL_CLASS[urgencia]}`}>
                    Parado há {contentor.diasParado} dias
                  </span>
                ) : null}
                {contentor.partindoEmBreve ? (
                  <span className="rounded-pill bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Parte em breve
                  </span>
                ) : null}
                {contentor.chegadaEmBreve ? (
                  <span className="rounded-pill bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Chegada em breve
                  </span>
                ) : null}
                {contentor.atrasado ? (
                  <span className="rounded-pill bg-error/15 px-2 py-0.5 text-[10px] font-semibold text-error">Atrasado</span>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-control border border-border bg-bg-app p-2 text-center">
                  <div className="text-[15px] font-semibold text-text-primary">{contentor.totalCargas}</div>
                  <div className="text-[10px] text-text-tertiary">Cargas</div>
                </div>
                <div className="rounded-control border border-border bg-bg-app p-2 text-center">
                  <div className="text-[15px] font-semibold text-text-primary">{contentor.pesoTotalKg.toFixed(1)}</div>
                  <div className="text-[10px] text-text-tertiary">Peso (kg)</div>
                </div>
                <div className="rounded-control border border-border bg-bg-app p-2 text-center">
                  <div className="text-[15px] font-semibold text-text-primary">{formatValor(contentor.valorTotal)}</div>
                  <div className="text-[10px] text-text-tertiary">Valor Total</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div>
                  <div className="text-text-tertiary">Data de Partida</div>
                  <div className="text-text-primary">{formatData(contentor.dataPartida)}</div>
                </div>
                <div>
                  <div className="text-text-tertiary">Chegada Prevista</div>
                  <div className="text-text-primary">{formatData(contentor.dataChegadaPrevista)}</div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Cargas ({cargas.length})
                </h3>
                {cargas.length === 0 ? (
                  <p className="text-[12px] text-text-tertiary">Nenhuma carga associada.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {cargas.slice(0, 8).map((carga) => (
                      <div key={carga.id} className="flex items-center justify-between text-[12px] text-text-secondary">
                        <span className="truncate">
                          {carga.codigo} — {carga.nome}
                        </span>
                        <span className="shrink-0">{formatValor(carga.valor ?? 0)}</span>
                      </div>
                    ))}
                    {cargas.length > 8 ? (
                      <p className="text-[11px] text-text-tertiary">+ {cargas.length - 8} outras cargas...</p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border p-lg">
          <button
            type="button"
            onClick={handleVerCargas}
            className="flex items-center justify-center gap-1.5 rounded-control bg-primary px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Ver Cargas deste Contentor <ArrowRight size={15} />
          </button>
          <button
            type="button"
            onClick={() => contentorId && onAbrirDetalhe(contentorId)}
            className="flex items-center justify-center gap-1.5 rounded-control border border-border px-3 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-app"
          >
            <Maximize2 size={14} /> Abrir Detalhes Completos
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
