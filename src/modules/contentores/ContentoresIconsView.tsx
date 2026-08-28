import { CheckCircle2, Lock, MoreHorizontal, Package } from 'lucide-react';
import { ESTADO_CONTENTOR_COLOR_CLASS, ESTADO_CONTENTOR_LABEL } from '@/constants/labels';
import { getUrgenciaTier, URGENCIA_PILL_CLASS } from '@/lib/contentorUrgencia';
import type { Contentor } from '@/types';

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function formatMesReferencia(mesReferencia: string): string {
  const [ano, mes] = mesReferencia.split('-');
  const idx = Number(mes) - 1;
  return `${MESES[idx] ?? mes} ${ano}`;
}

function formatValorResumido(valor: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor);
}

interface ContentoresIconsViewProps {
  contentores: Contentor[];
  limiteDiasParado: number;
  onPreview: (contentor: Contentor) => void;
  onSelect: (contentor: Contentor) => void;
  onContextMenu: (contentor: Contentor, x: number, y: number) => void;
}

export function ContentoresIconsView({
  contentores,
  limiteDiasParado,
  onPreview,
  onSelect,
  onContextMenu,
}: ContentoresIconsViewProps): React.JSX.Element {
  const grupos = new Map<string, Contentor[]>();
  for (const contentor of contentores) {
    const lista = grupos.get(contentor.mesReferencia) ?? [];
    lista.push(contentor);
    grupos.set(contentor.mesReferencia, lista);
  }
  const mesesOrdenados = [...grupos.keys()].sort((a, b) => b.localeCompare(a));

  if (contentores.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-text-tertiary">
        Nenhum contentor encontrado.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-xl">
      {mesesOrdenados.map((mes) => (
        <div key={mes} className="mb-xl">
          <h2 className="mb-md text-[13px] font-semibold text-text-secondary">{formatMesReferencia(mes)}</h2>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {grupos.get(mes)!.map((contentor) => {
              const Icon = contentor.bloqueado ? Lock : contentor.estado === 'entregue' ? CheckCircle2 : Package;
              const urgencia = contentor.diasParado != null ? getUrgenciaTier(contentor.diasParado, limiteDiasParado) : null;
              return (
                <div
                  key={contentor.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onPreview(contentor)}
                  onDoubleClick={() => onSelect(contentor)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onContextMenu(contentor, e.clientX, e.clientY);
                  }}
                  className="group relative flex flex-col items-center gap-1.5 rounded-surface border border-border bg-bg-surface p-lg text-center transition-colors hover:border-primary"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      onContextMenu(contentor, rect.left, rect.bottom + 4);
                    }}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-control text-text-tertiary opacity-0 transition-opacity hover:bg-bg-app group-hover:opacity-100"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  <Icon
                    size={32}
                    className={contentor.bloqueado ? 'text-error' : ESTADO_CONTENTOR_COLOR_CLASS[contentor.estado]}
                  />
                  <span className="truncate text-[13px] font-medium text-text-primary">{contentor.codigo}</span>
                  <span className={`text-[11px] ${ESTADO_CONTENTOR_COLOR_CLASS[contentor.estado]}`}>
                    {ESTADO_CONTENTOR_LABEL[contentor.estado]}
                  </span>

                  <span className="text-[11px] text-text-tertiary">
                    {contentor.totalCargas} {contentor.totalCargas === 1 ? 'carga' : 'cargas'} ·{' '}
                    {formatValorResumido(contentor.valorTotal)}
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
                    <span className="rounded-pill bg-error/15 px-2 py-0.5 text-[10px] font-semibold text-error">
                      Atrasado
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
