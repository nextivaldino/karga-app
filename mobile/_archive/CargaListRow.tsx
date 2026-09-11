import { useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, List as Menu, type Icon as LucideIcon } from '@phosphor-icons/react';
import { ESTADO_CLASS, ESTADO_ICON, ESTADO_LABEL, formatDimensoes, formatMoeda, type EstadoListaCarga } from '@/lib/cargaEstado';

export interface AcaoLinhaCarga {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destrutiva?: boolean;
}

export interface CargaListRowData {
  id: string;
  codigo: string;
  emissorNome: string;
  recetorNome: string;
  nomeCarga: string;
  comprimentoCm: number | null;
  larguraCm: number | null;
  alturaCm: number | null;
  valor: number | null;
  estado: EstadoListaCarga;
  nota: string | null;
}

interface CargaListRowProps {
  linha: CargaListRowData;
  acoes?: AcaoLinhaCarga[];
  // Contexto mais estreito (ex: dentro do popup Nova Carga, ~440px em vez
  // da largura toda do ecrã) — encolhe a coluna de Contactos para dar
  // espaço ao nome da carga, que é a informação mais importante ali.
  compacto?: boolean;
}

// Grelha comum a esta linha e ao cabeçalho de coluna — a coluna de Valor
// e o botão de ação à direita têm SEMPRE a mesma largura/preenchimento
// exterior nos dois sítios, para o "Valor" alinhar verticalmente.
export const LARGURA_VALOR = 'w-[70px]';
export const LARGURA_ACAO = 'w-9';
const LARGURA_CONTACTOS = 'w-[150px]';
const LARGURA_CONTACTOS_COMPACTA = 'w-[92px]';

// Cabeçalho de colunas — companion do CargaListRow.
export function CargaListHeader({ compacto }: { compacto?: boolean } = {}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 py-1 pl-4 pr-4 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
      <span className="w-16 shrink-0">Código</span>
      <span className={`${compacto ? LARGURA_CONTACTOS_COMPACTA : LARGURA_CONTACTOS} shrink-0`}>Contactos</span>
      <span className="min-w-0 flex-1">Carga</span>
      <span className={`${LARGURA_VALOR} shrink-0 text-right`}>Valor</span>
      <span className={`${LARGURA_ACAO} shrink-0`} />
    </div>
  );
}

// Linha plana e neutra — sempre fundo branco, separador fino em baixo.
// O único sinal de cor é o ícone/ponto de estado (o que precisa de
// atenção, não a que grupo pertence) e as setas emissor/recetor, que já
// eram pequenas o suficiente para não ler como "bloco de cor".
export function CargaListRow({ linha, acoes, compacto }: CargaListRowProps): React.JSX.Element {
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dimensoes = formatDimensoes(linha.comprimentoCm, linha.larguraCm, linha.alturaCm);
  const EstadoIcon = ESTADO_ICON[linha.estado];

  useEffect(() => {
    function onClickOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // "Aberta" — ainda não fechou o ciclo (por enviar, na fila, com erro ou
  // pendente de revisão no desktop) — ganha um ponto antes do código,
  // para se notar de imediato dentro da lista que ainda precisa de atenção.
  const aberta = linha.estado !== 'importada';

  return (
    <div className={`relative border-b border-border bg-bg-surface ${aberta ? 'py-[8.8px]' : 'py-2'} pl-4 pr-4 ${menuAberto ? 'z-20' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="flex w-16 shrink-0 items-center gap-1">
          {aberta ? <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ESTADO_CLASS[linha.estado]} bg-current`} /> : null}
          <span className="truncate text-[12px] font-bold text-text-primary">{linha.codigo}</span>
        </span>

        <span className={`flex ${compacto ? LARGURA_CONTACTOS_COMPACTA : LARGURA_CONTACTOS} shrink-0 flex-col gap-0.5 text-[12px]`}>
          <span className="flex items-center gap-1 font-medium text-text-primary">
            <ArrowUpRight size={12} className="shrink-0 text-primary" />
            <span className="truncate">{linha.emissorNome}</span>
          </span>
          <span className="flex items-center gap-1 font-medium text-text-primary">
            <ArrowDownLeft size={12} className="shrink-0 text-success" />
            <span className="truncate">{linha.recetorNome}</span>
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text-primary">{linha.nomeCarga}</span>
            <EstadoIcon size={14} className={`shrink-0 ${ESTADO_CLASS[linha.estado]}`} aria-label={ESTADO_LABEL[linha.estado]} />
          </div>
          {dimensoes ? <span className="block truncate text-[11px] font-light text-text-tertiary">{dimensoes}</span> : null}
        </div>

        <span className={`${LARGURA_VALOR} shrink-0 text-right text-[13px] font-medium tabular-nums text-text-primary`}>{formatMoeda(linha.valor)}</span>

        <div ref={menuRef} className={`relative flex ${LARGURA_ACAO} shrink-0 items-center justify-center`}>
          {acoes && acoes.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setMenuAberto((v) => !v)}
                title="Opções"
                className="flex h-9 w-9 items-center justify-center rounded-control text-text-tertiary active:bg-bg-app"
              >
                <Menu size={17} />
              </button>
              {menuAberto ? (
                <div className="absolute right-0 top-10 z-30 w-40 overflow-hidden rounded-surface border border-border bg-bg-surface shadow-medium">
                  {acoes.map((acao) => (
                    <button
                      key={acao.label}
                      type="button"
                      onClick={() => {
                        setMenuAberto(false);
                        acao.onClick();
                      }}
                      className={`flex min-h-touch w-full items-center gap-2 border-t border-border px-3 text-left text-[13px] first:border-t-0 ${
                        acao.destrutiva ? 'text-error active:bg-error/10' : 'text-text-primary active:bg-bg-app'
                      }`}
                    >
                      <acao.icon size={14} className={acao.destrutiva ? '' : 'text-text-secondary'} /> {acao.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {linha.nota ? <p className="mt-1 pl-[240px] text-[11px] text-error">{linha.nota}</p> : null}
    </div>
  );
}
