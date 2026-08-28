import { useRef } from 'react';
import { X } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { CargaComEmissor } from '@/types';

const ROW_HEIGHT = 36;

const BASE_COLUMNS = [
  { key: 'codigo', label: 'Código', width: '110px' },
  { key: 'nome', label: 'Nome', width: '1fr' },
  { key: 'emissor', label: 'Emissor', width: '1fr' },
  { key: 'c', label: 'C', width: '52px', title: 'Comprimento (cm)' },
  { key: 'l', label: 'L', width: '52px', title: 'Largura (cm)' },
  { key: 'a', label: 'A', width: '52px', title: 'Altura (cm)' },
  { key: 'm3', label: 'm³', width: '80px' },
  { key: 'peso', label: 'Peso', width: '90px' },
  { key: 'valor', label: 'Valor', width: '100px' },
  { key: 'pagamento', label: 'Pagamento', width: '100px' },
] as const;

function formatCm(valor: number | null): string {
  return valor == null ? '—' : `${valor}`;
}

function formatM3(m3: number | null): string {
  return m3 == null ? '—' : m3.toFixed(3);
}

function formatPeso(kg: number | null): string {
  return kg == null ? '—' : `${kg} kg`;
}

function formatValor(valor: number | null, moeda: string): string {
  if (valor == null) return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: moeda }).format(valor);
}

interface CargasListProps {
  cargas: CargaComEmissor[];
  loading: boolean;
  emptyMessage: string;
  onSelectCarga: (carga: CargaComEmissor) => void;
  onRemove?: (carga: CargaComEmissor) => void;
}

export function CargasList({ cargas, loading, emptyMessage, onSelectCarga, onRemove }: CargasListProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns = onRemove ? [...BASE_COLUMNS, { key: 'acoes', label: '', width: '32px' }] : BASE_COLUMNS;
  const gridTemplate = columns.map((c) => c.width).join(' ');

  const virtualizer = useVirtualizer({
    count: cargas.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  return (
    <div className="flex h-full flex-col">
      <div
        className="grid shrink-0 border-b border-border bg-bg-surface px-lg text-[11px] font-semibold uppercase tracking-wide text-text-tertiary"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {columns.map((col) => (
          <div key={col.key} className="truncate py-2" title={'title' in col ? col.title : undefined}>
            {col.label}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-text-tertiary">A carregar...</div>
      ) : cargas.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-text-tertiary">{emptyMessage}</div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const carga = cargas[virtualRow.index]!;
              return (
                <div
                  key={carga.id}
                  onClick={() => onSelectCarga(carga)}
                  className="group grid cursor-pointer items-center border-b border-border px-lg text-[13px] text-text-primary transition-colors hover:bg-bg-app"
                  style={{
                    gridTemplateColumns: gridTemplate,
                    height: virtualRow.size,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="truncate font-medium">{carga.codigo}</div>
                  <div className="truncate">{carga.nome}</div>
                  <div className="truncate text-text-secondary">{carga.emissorNome}</div>
                  <div className="truncate text-text-secondary">{formatCm(carga.comprimentoCm)}</div>
                  <div className="truncate text-text-secondary">{formatCm(carga.larguraCm)}</div>
                  <div className="truncate text-text-secondary">{formatCm(carga.alturaCm)}</div>
                  <div className="truncate text-text-secondary">{formatM3(carga.m3)}</div>
                  <div className="truncate text-text-secondary">{formatPeso(carga.pesoKg)}</div>
                  <div className="truncate text-text-secondary">{formatValor(carga.valor, carga.moeda)}</div>
                  <div>
                    <span
                      className={`rounded-pill px-2 py-0.5 text-[11px] font-medium ${
                        carga.estadoPagamento === 'pago'
                          ? 'bg-success/15 text-success'
                          : 'bg-warning/15 text-warning'
                      }`}
                    >
                      {carga.estadoPagamento === 'pago' ? 'Pago' : 'Devido'}
                    </span>
                  </div>
                  {onRemove ? (
                    <button
                      type="button"
                      title="Remover do contentor"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(carga);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-control text-text-tertiary opacity-0 transition-opacity hover:bg-bg-surface hover:text-error group-hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
