import { DotsThree as MoreHorizontal, Stack } from '@phosphor-icons/react';
import { ESTADO_CONTENTOR_COLOR_CLASS, ESTADO_CONTENTOR_LABEL } from '@/constants/labels';
import { getUrgenciaTier, URGENCIA_TEXT_CLASS } from '@/lib/contentorUrgencia';
import { formatData } from '@/lib/formatData';
import type { Contentor } from '@/types';

const COLUMNS = [
  { key: 'codigo', label: 'Código', width: '110px' },
  { key: 'nome', label: 'Nome', width: '1fr' },
  { key: 'categoria', label: 'Categoria', width: '110px' },
  { key: 'mesReferencia', label: 'Mês Ref.', width: '90px' },
  { key: 'estado', label: 'Estado', width: '110px' },
  { key: 'totalCargas', label: 'Nº Cargas', width: '90px' },
  { key: 'pesoTotalKg', label: 'Peso Total', width: '100px' },
  { key: 'm3Total', label: 'm³ Total', width: '90px' },
  { key: 'valorTotal', label: 'Valor Total', width: '110px' },
  { key: 'dataChegadaPrevista', label: 'Chegada Prevista', width: '130px' },
  { key: 'acoes', label: '', width: '32px' },
] as const;

const GRID_TEMPLATE = COLUMNS.map((c) => c.width).join(' ');

interface ContentoresListViewProps {
  contentores: Contentor[];
  limiteDiasParado: number;
  onPreview: (contentor: Contentor) => void;
  onSelect: (contentor: Contentor) => void;
  onContextMenu: (contentor: Contentor, x: number, y: number) => void;
}

export function ContentoresListView({
  contentores,
  limiteDiasParado,
  onPreview,
  onSelect,
  onContextMenu,
}: ContentoresListViewProps): React.JSX.Element {
  if (contentores.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-[13px] text-text-tertiary">
        <Stack size={32} className="opacity-50" />
        Nenhum contentor encontrado.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div
        className="grid shrink-0 border-b border-border bg-bg-surface px-lg text-[11px] font-semibold uppercase tracking-wide text-text-tertiary"
        style={{ gridTemplateColumns: GRID_TEMPLATE }}
      >
        {COLUMNS.map((col) => (
          <div key={col.key} className="truncate py-2">
            {col.label}
          </div>
        ))}
      </div>
      {contentores.map((contentor) => {
        const urgencia = contentor.diasParado != null ? getUrgenciaTier(contentor.diasParado, limiteDiasParado) : null;
        return (
          <div
            key={contentor.id}
            onClick={() => onPreview(contentor)}
            onDoubleClick={() => onSelect(contentor)}
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu(contentor, e.clientX, e.clientY);
            }}
            className="group grid cursor-pointer items-center border-b border-border px-lg py-2 text-[13px] text-text-primary transition-colors hover:bg-bg-app"
            style={{ gridTemplateColumns: GRID_TEMPLATE }}
          >
            <span className="truncate font-medium">{contentor.codigo}</span>
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <span className="truncate">{contentor.nome}</span>
              {urgencia && contentor.diasParado != null ? (
                <span title={`Parado há ${contentor.diasParado} dias`} className={`shrink-0 text-[12px] ${URGENCIA_TEXT_CLASS[urgencia]}`}>
                  ⏳
                </span>
              ) : null}
              {contentor.partindoEmBreve ? (
                <span title="Parte em breve" className="shrink-0 text-[12px] text-primary">
                  🚀
                </span>
              ) : null}
              {contentor.chegadaEmBreve ? (
                <span title="Chegada em breve" className="shrink-0 text-[12px] text-primary">
                  📍
                </span>
              ) : null}
              {contentor.atrasado ? (
                <span title="Atrasado" className="shrink-0 text-[12px] text-error">
                  ⚠️
                </span>
              ) : null}
            </span>
            <span className="truncate text-text-secondary">{contentor.categoria ?? '—'}</span>
            <span className="text-text-secondary">{contentor.mesReferencia}</span>
            <span className={ESTADO_CONTENTOR_COLOR_CLASS[contentor.estado]}>
              {ESTADO_CONTENTOR_LABEL[contentor.estado]}
              {contentor.bloqueado ? ' 🔒' : ''}
            </span>
            <span className="text-text-secondary">{contentor.totalCargas}</span>
            <span className="text-text-secondary">{contentor.pesoTotalKg.toFixed(1)} kg</span>
            <span className="text-text-secondary">{contentor.m3Total.toFixed(3)}</span>
            <span className="text-text-secondary">
              {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(contentor.valorTotal)}
            </span>
            <span className="text-text-secondary">{formatData(contentor.dataChegadaPrevista)}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                onContextMenu(contentor, rect.left, rect.bottom + 4);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-control text-text-tertiary opacity-0 transition-opacity hover:bg-bg-surface group-hover:opacity-100"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
