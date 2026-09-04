import { useState } from 'react';
import { CaretLeft, CaretRight, CheckCircle, Lock, DotsThree, Stack } from '@phosphor-icons/react';
import { ModuleIcon } from '@/components/icons/ModuleIcon';
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

// Tamanho do cartão proporcional ao nº de cargas — um contentor mais
// cheio "pesa" mais visualmente no quadro. `escala` (0 a 1) é a posição
// do contentor entre o mínimo e o máximo de cargas do conjunto atual;
// os limites (`MIN_*`/`MAX_*`) garantem que nunca fica ilegível nem
// desproporcionado, mesmo com um único contentor muito cheio ou vazio.
const MIN_PAD = 10;
const MAX_PAD = 20;
const MIN_HEIGHT = 62;
const MAX_HEIGHT = 100;

function calcularEscala(cargas: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.min(1, Math.max(0, (cargas - min) / (max - min)));
}

interface ContentoresIconsViewProps {
  contentores: Contentor[];
  limiteDiasParado: number;
  onPreview: (contentor: Contentor) => void;
  onSelect: (contentor: Contentor) => void;
  onContextMenu: (contentor: Contentor, x: number, y: number) => void;
}

// Cartão compacto pensado para uma coluna estreita (lane de mês) — a
// informação essencial cabe numa ou duas linhas, os detalhes secundários
// (urgência, categoria) ficam como badges que quebram linha quando preciso.
function CartaoContentor({
  contentor,
  limiteDiasParado,
  escala,
  onPreview,
  onSelect,
  onContextMenu,
}: {
  contentor: Contentor;
  limiteDiasParado: number;
  escala: number;
  onPreview: (c: Contentor) => void;
  onSelect: (c: Contentor) => void;
  onContextMenu: (c: Contentor, x: number, y: number) => void;
}): React.JSX.Element {
  const urgencia = contentor.diasParado != null ? getUrgenciaTier(contentor.diasParado, limiteDiasParado) : null;
  const statusIconClass = `shrink-0 ${contentor.bloqueado ? 'text-error' : ESTADO_CONTENTOR_COLOR_CLASS[contentor.estado]}`;
  const padding = Math.round(MIN_PAD + escala * (MAX_PAD - MIN_PAD));
  const minHeight = Math.round(MIN_HEIGHT + escala * (MAX_HEIGHT - MIN_HEIGHT));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onPreview(contentor)}
      onDoubleClick={() => onSelect(contentor)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(contentor, e.clientX, e.clientY);
      }}
      style={{ padding, minHeight }}
      className={`group relative flex flex-col gap-1.5 rounded-surface border border-border bg-bg-surface text-left transition-colors hover:border-primary ${
        contentor.bloqueado ? 'opacity-55 hover:opacity-100' : ''
      }`}
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
        <DotsThree size={16} />
      </button>

      <div className="flex items-center gap-2">
        {contentor.bloqueado ? (
          <Lock size={20} weight="fill" className={statusIconClass} />
        ) : contentor.estado === 'entregue' ? (
          <CheckCircle size={20} weight="fill" className={statusIconClass} />
        ) : (
          <ModuleIcon module="contentores" size={20} />
        )}
        <span className="truncate text-[13px] font-medium text-text-primary">{contentor.codigo}</span>
        <span className={`ml-auto shrink-0 text-[11px] ${ESTADO_CONTENTOR_COLOR_CLASS[contentor.estado]}`}>
          {ESTADO_CONTENTOR_LABEL[contentor.estado]}
        </span>
      </div>

      <span className="truncate text-[12px] text-text-secondary">{contentor.nome}</span>

      <div className="flex items-baseline gap-1.5">
        <span className="text-[20px] font-bold leading-none text-text-primary">{contentor.totalCargas}</span>
        <span className="text-[11px] text-text-tertiary">
          {contentor.totalCargas === 1 ? 'carga' : 'cargas'} · {formatValorResumido(contentor.valorTotal)}
        </span>
      </div>

      {contentor.categoria || urgencia || contentor.partindoEmBreve || contentor.chegadaEmBreve || contentor.atrasado ? (
        <div className="flex flex-wrap gap-1">
          {contentor.categoria ? (
            <span className="rounded-pill border border-border px-2 py-0.5 text-[10px] text-text-secondary">{contentor.categoria}</span>
          ) : null}
          {urgencia && contentor.diasParado != null ? (
            <span className={`rounded-pill px-2 py-0.5 text-[10px] ${URGENCIA_PILL_CLASS[urgencia]}`}>
              Parado há {contentor.diasParado}d
            </span>
          ) : null}
          {contentor.partindoEmBreve ? (
            <span className="rounded-pill bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">Parte em breve</span>
          ) : null}
          {contentor.chegadaEmBreve ? (
            <span className="rounded-pill bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">Chegada em breve</span>
          ) : null}
          {contentor.atrasado ? (
            <span className="rounded-pill bg-error/15 px-2 py-0.5 text-[10px] font-semibold text-error">Atrasado</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Grid de "lanes" por mês (estilo quadro Kanban) — em vez de uma única
// linha com scroll horizontal sem fim, os meses quebram em várias linhas
// conforme a largura disponível (`grid-template-columns: auto-fill`), com
// scroll vertical na página toda. Cada lane tem ainda o seu próprio
// scroll interno (`max-h`) para o caso de um mês ter muitos contentores.
// Quando os dados cobrem mais do que um ano, aparece um seletor de ano
// por cima da grelha — cada ano mostra só os seus próprios meses.
const ALTURA_MAX_LANE = 560;

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
  const anosDisponiveis = [...new Set(mesesOrdenados.map((mes) => mes.split('-')[0]!))].sort((a, b) => b.localeCompare(a));

  const [anoSelecionado, setAnoSelecionado] = useState<string | null>(null);
  const ano = anoSelecionado && anosDisponiveis.includes(anoSelecionado) ? anoSelecionado : (anosDisponiveis[0] ?? null);
  const anoIndex = ano ? anosDisponiveis.indexOf(ano) : -1;
  const mesesDoAno = ano ? mesesOrdenados.filter((mes) => mes.startsWith(`${ano}-`)) : [];

  const cargasValores = contentores.map((c) => c.totalCargas);
  const minCargas = Math.min(...cargasValores);
  const maxCargas = Math.max(...cargasValores);

  if (contentores.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-[13px] text-text-tertiary">
        <Stack size={32} className="opacity-50" />
        Nenhum contentor encontrado.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-md overflow-y-auto p-xl">
      {anosDisponiveis.length > 1 ? (
        <div className="flex shrink-0 items-center justify-center gap-3">
          <button
            type="button"
            disabled={anoIndex >= anosDisponiveis.length - 1}
            onClick={() => setAnoSelecionado(anosDisponiveis[anoIndex + 1]!)}
            title="Ano anterior"
            className="flex h-7 w-7 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app disabled:cursor-not-allowed disabled:opacity-30"
          >
            <CaretLeft size={16} />
          </button>
          <span className="text-[14px] font-semibold text-text-primary">{ano}</span>
          <button
            type="button"
            disabled={anoIndex <= 0}
            onClick={() => setAnoSelecionado(anosDisponiveis[anoIndex - 1]!)}
            title="Ano seguinte"
            className="flex h-7 w-7 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app disabled:cursor-not-allowed disabled:opacity-30"
          >
            <CaretRight size={16} />
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] items-start gap-lg">
        {mesesDoAno.map((mes) => {
          const itens = grupos.get(mes)!;
          const valorTotalMes = itens.reduce((soma, c) => soma + c.valorTotal, 0);
          return (
            <div key={mes} className="flex flex-col gap-md">
              <div className="flex items-baseline justify-between gap-2 border-b border-border pb-2">
                <h2 className="text-[13px] font-semibold text-text-primary">{formatMesReferencia(mes)}</h2>
                <span className="shrink-0 text-[11px] text-text-tertiary">
                  {itens.length} · {formatValorResumido(valorTotalMes)}
                </span>
              </div>
              <div className="flex flex-col gap-sm overflow-y-auto pr-1" style={{ maxHeight: ALTURA_MAX_LANE }}>
                {itens.map((contentor) => (
                  <CartaoContentor
                    key={contentor.id}
                    contentor={contentor}
                    limiteDiasParado={limiteDiasParado}
                    escala={calcularEscala(contentor.totalCargas, minCargas, maxCargas)}
                    onPreview={onPreview}
                    onSelect={onSelect}
                    onContextMenu={onContextMenu}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
