import { useRef, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, DeviceMobile, DotsThree, Package, X } from '@phosphor-icons/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { formatValor } from '@/lib/formatValor';
import { useCargaAcoesMenu } from './useCargaAcoesMenu';
import type { UsuarioResumo } from '@/hooks/useUsuariosPorId';
import type { CargaComEmissor, Contentor } from '@/types';

const ROW_HEIGHT_CONFORTAVEL = 36;
const ROW_HEIGHT_COMPACTA = 28;

// Tons pastel bem leves, alternados por linha (não por estado/coluna) —
// só para dar variedade visual à lista comprida; o hover usa brightness
// em vez de trocar o fundo, funciona por cima de qualquer tom da linha.
export const ROW_TINTS = ['var(--color-primary)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-purple)'];

const BASE_COLUMNS = [
  { key: 'num', label: '#', width: '44px' },
  { key: 'codigo', label: 'Código', width: '110px' },
  { key: 'nome', label: 'Nome', width: '1fr' },
  { key: 'c', label: 'C', width: '52px', title: 'Comprimento (cm)' },
  { key: 'l', label: 'L', width: '52px', title: 'Largura (cm)' },
  { key: 'a', label: 'A', width: '52px', title: 'Altura (cm)' },
  { key: 'm3', label: 'm³', width: '80px' },
  { key: 'peso', label: 'Peso', width: '90px' },
  { key: 'emissor', label: 'Emissor', width: '1fr' },
  { key: 'recetor', label: 'Recetor', width: '1fr' },
  { key: 'valor', label: 'Valor', width: '100px' },
  { key: 'pagamento', label: 'Pagamento', width: '100px' },
  { key: 'origem', label: 'Origem', width: '120px' },
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

interface CargasListProps {
  cargas: CargaComEmissor[];
  loading: boolean;
  emptyMessage: string;
  onSelectCarga: (carga: CargaComEmissor) => void;
  onRemove?: (carga: CargaComEmissor) => void;
  densidade?: 'confortavel' | 'compacta';
  // Chave por `carga.origemPwaUserId ?? carga.criadoPorUserId` — cobre
  // tanto quem inseriu via PWA como quem criou a carga no desktop, com
  // o mesmo avatar/nome reais em vez do ícone genérico de telemóvel.
  usuariosPorId?: Map<string, UsuarioResumo>;
  // Presença opcional — quando definidos, cada linha ganha um menu de
  // contexto (clique direito ou "⋯" ao passar o rato) com Editar, marcar
  // Pago/Devido, mover para outro contentor e Arquivar (sempre com
  // confirmação, nunca apaga sem perguntar).
  contentoresAbertos?: Contentor[];
  onDataChanged?: () => void;
}

export function CargasList({
  cargas,
  loading,
  emptyMessage,
  onSelectCarga,
  onRemove,
  densidade = 'confortavel',
  usuariosPorId,
  contentoresAbertos,
  onDataChanged,
}: CargasListProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { abrirMenu, abrirMenuNoBotao, renderMenu } = useCargaAcoesMenu({
    onEditar: onSelectCarga,
    contentoresAbertos,
    onDataChanged,
  });
  const columns = [
    ...BASE_COLUMNS,
    ...(onRemove ? [{ key: 'acoes', label: '', width: '32px' } as const] : []),
    ...(onDataChanged ? [{ key: 'menu', label: '', width: '32px' } as const] : []),
  ];
  const gridTemplate = columns.map((c) => c.width).join(' ');
  const rowHeight = densidade === 'compacta' ? ROW_HEIGHT_COMPACTA : ROW_HEIGHT_CONFORTAVEL;

  const virtualizer = useVirtualizer({
    count: cargas.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  // O virtualizer guarda as alturas em cache e só as recalcula se o
  // `count` mudar — trocar de densidade não invalida esse cache sozinho,
  // por isso forçamos remedição explícita quando `rowHeight` muda.
  useEffect(() => {
    virtualizer.measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowHeight]);

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
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[13px] text-text-tertiary">
          <Package size={32} className="opacity-50" />
          {emptyMessage}
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const carga = cargas[virtualRow.index]!;
              const tint = ROW_TINTS[virtualRow.index % ROW_TINTS.length];
              return (
                <div
                  key={carga.id}
                  onClick={() => onSelectCarga(carga)}
                  onContextMenu={(e) => {
                    if (!onDataChanged) return;
                    e.preventDefault();
                    abrirMenu(carga, e.clientX, e.clientY);
                  }}
                  className={`group grid cursor-pointer items-center px-lg text-text-primary transition-[filter] hover:brightness-95 ${
                    densidade === 'compacta' ? 'text-[12px]' : 'text-[13px]'
                  }`}
                  style={{
                    gridTemplateColumns: gridTemplate,
                    height: virtualRow.size,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                    backgroundColor: `color-mix(in srgb, ${tint} 5%, var(--bg-surface))`,
                  }}
                >
                  <div className="truncate text-text-tertiary">{virtualRow.index + 1}</div>
                  <div className="truncate font-medium">{carga.codigo}</div>
                  <div className="truncate">{carga.nome}</div>
                  <div className="truncate text-text-secondary">{formatCm(carga.comprimentoCm)}</div>
                  <div className="truncate text-text-secondary">{formatCm(carga.larguraCm)}</div>
                  <div className="truncate text-text-secondary">{formatCm(carga.alturaCm)}</div>
                  <div className="truncate text-text-secondary">{formatM3(carga.m3)}</div>
                  <div className="truncate text-text-secondary">{formatPeso(carga.pesoKg)}</div>
                  <div className="flex min-w-0 items-center gap-1 text-text-secondary">
                    <ArrowUpRight size={12} className="shrink-0 text-primary" />
                    <span className="truncate">{carga.emissorNome}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-1 text-text-secondary">
                    {carga.destinatarios.length > 0 ? <ArrowDownLeft size={12} className="shrink-0 text-success" /> : null}
                    <span className="truncate">{carga.destinatarios.join(', ') || '—'}</span>
                  </div>
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
                  <div className="flex min-w-0 items-center gap-1.5 text-text-secondary">
                    {(() => {
                      const userId = carga.origemPwaUserId ?? carga.criadoPorUserId;
                      if (!userId) return <span className="text-text-tertiary">—</span>;
                      const usuario = usuariosPorId?.get(userId);
                      return (
                        <>
                          <span className="relative shrink-0">
                            <UserAvatar avatar={usuario?.avatar ?? null} size={18} />
                            {carga.origemPwaUserId ? (
                              <span
                                title="Inserido via PWA"
                                className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full border border-bg-surface bg-primary text-white"
                              >
                                <DeviceMobile size={8} weight="bold" />
                              </span>
                            ) : null}
                          </span>
                          <span className="truncate">{usuario?.name ?? '—'}</span>
                        </>
                      );
                    })()}
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
                  {onDataChanged ? (
                    <button
                      type="button"
                      title="Gerir carga"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirMenuNoBotao(e, carga);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-control text-text-tertiary opacity-0 transition-opacity hover:bg-bg-surface hover:text-text-primary group-hover:opacity-100"
                    >
                      <DotsThree size={16} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {renderMenu()}
    </div>
  );
}
