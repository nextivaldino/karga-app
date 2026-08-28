import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { ipcService } from '@/services/ipcService';
import { FaturaPreviewModal } from './FaturaPreviewModal';
import type { CargaComEmissor, Contentor, ResumoCliente } from '@/types';

interface ClienteDetalheModalProps {
  open: boolean;
  onClose: () => void;
  cliente: ResumoCliente | null;
  contentorId: string | null;
  escopoTodos: boolean;
  onDataChanged: () => void;
}

function formatValor(valor: number | null, moeda: string): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: moeda }).format(valor ?? 0);
}

interface CargaLinhaProps {
  carga: CargaComEmissor;
  onTogglePagamento: (carga: CargaComEmissor) => void;
}

function CargaLinha({ carga, onTogglePagamento }: CargaLinhaProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-[80px_1fr_80px_80px] items-center border-t border-border px-3 py-1.5 text-text-primary">
      <span className="truncate">{carga.codigo}</span>
      <span className="truncate">{carga.nome}</span>
      <span>{formatValor(carga.valor, carga.moeda)}</span>
      <button
        type="button"
        onClick={() => onTogglePagamento(carga)}
        className={`w-fit rounded-pill px-2 py-0.5 text-[11px] font-medium transition-colors ${
          carga.estadoPagamento === 'pago' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
        }`}
        title="Clicar para alternar Pago/Devido"
      >
        {carga.estadoPagamento === 'pago' ? 'Pago' : 'Devido'}
      </button>
    </div>
  );
}

export function ClienteDetalheModal({
  open,
  onClose,
  cliente,
  contentorId,
  escopoTodos,
  onDataChanged,
}: ClienteDetalheModalProps): React.JSX.Element | null {
  const [cargas, setCargas] = useState<CargaComEmissor[]>([]);
  const [contentoresPorId, setContentoresPorId] = useState<Record<string, Contentor>>({});
  const [colapsados, setColapsados] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [faturaOpen, setFaturaOpen] = useState(false);

  useEffect(() => {
    if (!open || !cliente) return;
    setLoading(true);
    setColapsados({});
    const cargasPromise = ipcService.cargas.list({
      emissorId: cliente.contactoId,
      contentorId: escopoTodos ? undefined : (contentorId ?? undefined),
    });
    const contentoresPromise = escopoTodos
      ? ipcService.contentores.list({ incluirOcultos: true })
      : Promise.resolve<Contentor[]>([]);
    void Promise.all([cargasPromise, contentoresPromise]).then(([items, contentores]) => {
      setCargas(items);
      setContentoresPorId(Object.fromEntries(contentores.map((c) => [c.id, c])));
      setLoading(false);
    });
  }, [open, cliente, contentorId, escopoTodos]);

  if (!cliente) return null;

  async function handleTogglePagamento(carga: CargaComEmissor): Promise<void> {
    const novoEstado = carga.estadoPagamento === 'pago' ? 'devido' : 'pago';
    const updated = await ipcService.cargas.update(carga.id, { estadoPagamento: novoEstado });
    if (updated) {
      setCargas((prev) => prev.map((c) => (c.id === carga.id ? { ...c, estadoPagamento: novoEstado } : c)));
      onDataChanged();
    }
  }

  function toggleColapsado(key: string): void {
    setColapsados((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const moeda = cargas[0]?.moeda ?? 'EUR';
  const totalGeral = cargas.reduce((sum, c) => sum + (c.valor ?? 0), 0);
  const totalPago = cargas.filter((c) => c.estadoPagamento === 'pago').reduce((sum, c) => sum + (c.valor ?? 0), 0);
  const totalDevido = cargas.filter((c) => c.estadoPagamento === 'devido').reduce((sum, c) => sum + (c.valor ?? 0), 0);

  const grupos = escopoTodos
    ? Object.entries(
        cargas.reduce<Record<string, CargaComEmissor[]>>((acc, c) => {
          const key = c.contentorId ?? 'sem-contentor';
          (acc[key] ??= []).push(c);
          return acc;
        }, {}),
      ).sort(([a], [b]) => (contentoresPorId[a]?.codigo ?? '').localeCompare(contentoresPorId[b]?.codigo ?? ''))
    : null;

  return (
    <>
      <HeaderBarModal
        open={open && !faturaOpen}
        onClose={onClose}
        title={cliente.nome}
        widthClassName="max-w-[560px]"
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="rounded-control px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => setFaturaOpen(true)}
              className="rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Gerar Fatura/Recibo
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-lg text-[13px]">
          {loading ? (
            <p className="text-text-tertiary">A carregar...</p>
          ) : grupos ? (
            <div className="flex flex-col gap-2">
              {grupos.map(([contentorId, cargasDoGrupo]) => {
                const contentor = contentoresPorId[contentorId];
                const colapsado = colapsados[contentorId];
                const valorGrupo = cargasDoGrupo.reduce((sum, c) => sum + (c.valor ?? 0), 0);
                return (
                  <div key={contentorId} className="overflow-hidden rounded-control border border-border">
                    <button
                      type="button"
                      onClick={() => toggleColapsado(contentorId)}
                      className="flex w-full items-center gap-2 bg-bg-app px-3 py-1.5 text-left text-[12px] font-semibold text-text-secondary transition-colors hover:bg-[var(--toolbar-hover)]"
                    >
                      <ChevronDown size={14} className={`shrink-0 transition-transform ${colapsado ? '-rotate-90' : ''}`} />
                      <span className="flex-1 truncate">
                        {contentor ? `${contentor.codigo} — ${contentor.nome}` : 'Sem contentor'}
                      </span>
                      <span className="shrink-0 text-text-tertiary">
                        {cargasDoGrupo.length} {cargasDoGrupo.length === 1 ? 'carga' : 'cargas'} ·{' '}
                        {formatValor(valorGrupo, cargasDoGrupo[0]?.moeda ?? 'EUR')}
                      </span>
                    </button>
                    {!colapsado ? (
                      <div className="grid grid-cols-[80px_1fr_80px_80px] border-t border-border bg-bg-app px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                        <span>Código</span>
                        <span>Nome</span>
                        <span>Valor</span>
                        <span>Estado</span>
                      </div>
                    ) : null}
                    {!colapsado
                      ? cargasDoGrupo.map((carga) => (
                          <CargaLinha key={carga.id} carga={carga} onTogglePagamento={handleTogglePagamento} />
                        ))
                      : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-control border border-border">
              <div className="grid grid-cols-[80px_1fr_80px_80px] bg-bg-app px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                <span>Código</span>
                <span>Nome</span>
                <span>Valor</span>
                <span>Estado</span>
              </div>
              {cargas.map((carga) => (
                <CargaLinha key={carga.id} carga={carga} onTogglePagamento={handleTogglePagamento} />
              ))}
            </div>
          )}

          <div className="ml-auto w-56 text-[13px]">
            <div className="flex justify-between py-0.5">
              <span className="text-text-secondary">Total</span>
              <span>{formatValor(totalGeral, moeda)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-text-secondary">Pago</span>
              <span>{formatValor(totalPago, moeda)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 font-semibold">
              <span>Devido</span>
              <span>{formatValor(totalDevido, moeda)}</span>
            </div>
          </div>
        </div>
      </HeaderBarModal>

      <FaturaPreviewModal
        open={faturaOpen}
        onClose={() => setFaturaOpen(false)}
        cliente={cliente}
        cargas={cargas}
        contentorId={escopoTodos ? undefined : (contentorId ?? undefined)}
      />
    </>
  );
}
