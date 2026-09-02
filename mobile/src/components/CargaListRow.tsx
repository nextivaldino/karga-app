import { useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Menu, type LucideIcon } from 'lucide-react';
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
  corGrupo: string;
  acoes?: AcaoLinhaCarga[];
}

// Cabeçalho de colunas — companion do CargaListRow.
export function CargaListHeader(): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 py-1 pl-2.5 pr-2 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
      <span className="w-16 shrink-0">Código</span>
      <span className="w-[132px] shrink-0">Contactos</span>
      <span className="min-w-0 flex-1">Carga</span>
      <span className="w-7 shrink-0" />
    </div>
  );
}

// Linha "encostada" (sem cantos arredondados, sem sombra, sem espaço entre
// linhas) — faixa de cor à esquerda identifica o GRUPO (emissor), não a
// linha individual. Não há tap na linha: todas as ações vivem no menu "☰".
export function CargaListRow({ linha, corGrupo, acoes }: CargaListRowProps): React.JSX.Element {
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

  return (
    <div className="relative border-b border-border bg-bg-surface py-2 pl-2.5 pr-2" style={{ borderLeft: `3px solid ${corGrupo}` }}>
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 truncate text-[12px] font-bold text-text-primary">{linha.codigo}</span>

        <span className="flex w-[132px] shrink-0 flex-col gap-0.5 text-[12px]">
          <span className="flex items-center gap-1 font-medium text-text-primary">
            <ArrowUpRight size={12} className="shrink-0 text-primary" />
            <span className="truncate">{linha.emissorNome}</span>
          </span>
          <span className="flex items-center gap-1 text-text-secondary">
            <ArrowDownLeft size={12} className="shrink-0 text-success" />
            <span className="truncate">{linha.recetorNome}</span>
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text-primary">{linha.nomeCarga}</span>
            <EstadoIcon size={14} className={`shrink-0 ${ESTADO_CLASS[linha.estado]}`} aria-label={ESTADO_LABEL[linha.estado]} />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[11px] font-light text-text-tertiary">{dimensoes ?? ''}</span>
            <span className="shrink-0 text-[13px] font-bold tabular-nums text-text-primary">{formatMoeda(linha.valor)}</span>
          </div>
        </div>

        <div ref={menuRef} className="relative flex w-7 shrink-0 items-center justify-center">
          {acoes && acoes.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setMenuAberto((v) => !v)}
                title="Opções"
                className="flex h-8 w-8 items-center justify-center rounded-control text-text-tertiary active:bg-bg-app"
              >
                <Menu size={17} />
              </button>
              {menuAberto ? (
                <div className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-control border border-border bg-bg-surface shadow-lg">
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

      {linha.nota ? <p className="mt-1 pl-[222px] text-[11px] text-error">{linha.nota}</p> : null}
    </div>
  );
}
