import { DotsThreeVertical } from '@phosphor-icons/react';
import { ESTADO_CLASS, ESTADO_LABEL, formatDimensoes, formatMoeda, type EstadoListaCarga } from '@/lib/cargaEstado';

export interface CargaRowData {
  id: string;
  // null = ainda não importada no Desktop (nunca teve código atribuído).
  codigo: string | null;
  nomeCarga: string;
  emissorNome: string;
  recetorNome: string;
  comprimentoCm: number | null;
  larguraCm: number | null;
  alturaCm: number | null;
  valor: number | null;
  estado: EstadoListaCarga;
}

interface CargaRowProps {
  carga: CargaRowData;
  // Posição sequencial na lista atual (1, 2, 3...) — só numeração visual,
  // não é identificador nem código da carga.
  numero: number;
  onAbrirOpcoes: (carga: CargaRowData) => void;
}

// Linha reutilizável de 7 colunas — Nº · Código · Emissor/Recetor · Nome
// da carga · Dimensões · Valor · Opções — usada na lista Cargas e dentro
// do detalhe de um Contacto. Nome da carga e Dimensões, por essa ordem,
// são as colunas que encolhem/truncam primeiro em ecrãs estreitos (~375-
// 390px); Nº, Código e Valor nunca truncam. Reaproveita
// ESTADO_CLASS/ESTADO_LABEL/formatDimensoes/formatMoeda já existentes em
// lib/cargaEstado.ts (nada de schema novo).
export function CargaRow({ carga, numero, onAbrirOpcoes }: CargaRowProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-[20px_44px_minmax(0,2fr)_minmax(0,0.75fr)_minmax(0,0.85fr)_48px_24px] items-center gap-1 border-b border-border px-2 py-2 last:border-b-0 active:bg-white/[0.03]">
      <span className="flex items-center gap-[3px]">
        <span
          className={`h-[5px] w-[5px] shrink-0 rounded-full bg-current ${ESTADO_CLASS[carga.estado]}`}
          aria-label={ESTADO_LABEL[carga.estado]}
        />
        <span className="text-[10.5px] tabular-nums text-text-tertiary">{numero}</span>
      </span>
      <span className="whitespace-nowrap text-[11.5px] font-bold tabular-nums text-primary-hover">{carga.codigo ?? '—'}</span>
      <span className="flex min-w-0 flex-col gap-[3px]">
        <span className="truncate text-[13px] text-text-primary">{carga.emissorNome}</span>
        <span className="flex min-w-0 items-center gap-[5px]">
          <span className="shrink-0 text-[10px] text-text-tertiary">→</span>
          <span className="truncate text-[13px] text-text-secondary">{carga.recetorNome}</span>
        </span>
      </span>
      <span className="truncate text-[11.5px] text-text-tertiary">{carga.nomeCarga}</span>
      <span className="truncate text-right text-[10.5px] tabular-nums text-text-secondary">
        {formatDimensoes(carga.comprimentoCm, carga.larguraCm, carga.alturaCm) ?? '—'}
      </span>
      <span className="whitespace-nowrap text-right text-[12.5px] font-bold tabular-nums text-text-primary">{formatMoeda(carga.valor)}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAbrirOpcoes(carga);
        }}
        className="flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary active:bg-glass-press active:text-text-primary"
      >
        <DotsThreeVertical size={16} weight="bold" />
      </button>
    </div>
  );
}
