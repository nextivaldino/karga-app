import { useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Menu } from 'lucide-react';
import { ESTADO_CLASS, ESTADO_ICON, ESTADO_LABEL, formatMoeda } from '@/lib/cargaEstado';
import type { AcaoLinhaCarga, CargaListRowData } from '@/components/CargaListRow';

interface CargaGridCardProps {
  linha: CargaListRowData;
  cor: string;
  acoes?: AcaoLinhaCarga[];
}

// Cartão compacto para a vista em grelha — mesma cor por contacto que a
// vista em lista (consistência entre os dois modos), mas aqui cada carga
// é o seu próprio bloco visual em vez de uma linha de tabela.
export function CargaGridCard({ linha, cor, acoes }: CargaGridCardProps): React.JSX.Element {
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const EstadoIcon = ESTADO_ICON[linha.estado];

  useEffect(() => {
    function onClickOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative flex flex-col gap-2 rounded-surface border border-border bg-bg-surface p-3" style={{ borderTop: `3px solid ${cor}` }}>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">{linha.codigo}</span>
          <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-text-primary">{linha.nomeCarga}</p>
        </div>
        {acoes && acoes.length > 0 ? (
          <div ref={menuRef} className="relative -mr-1 -mt-1 shrink-0">
            <button
              type="button"
              onClick={() => setMenuAberto((v) => !v)}
              title="Opções"
              className="flex h-7 w-7 items-center justify-center rounded-control text-text-tertiary active:bg-bg-app"
            >
              <Menu size={15} />
            </button>
            {menuAberto ? (
              <div className="absolute right-0 top-8 z-30 w-36 overflow-hidden rounded-control border border-border bg-bg-surface shadow-lg">
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
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-0.5 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1 truncate">
          <ArrowUpRight size={11} className="shrink-0 text-primary" />
          <span className="truncate">{linha.emissorNome}</span>
        </span>
        <span className="flex items-center gap-1 truncate">
          <ArrowDownLeft size={11} className="shrink-0 text-success" />
          <span className="truncate">{linha.recetorNome}</span>
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
        <EstadoIcon size={14} className={ESTADO_CLASS[linha.estado]} aria-label={ESTADO_LABEL[linha.estado]} />
        <span className="text-[13px] font-bold tabular-nums text-text-primary">{formatMoeda(linha.valor)}</span>
      </div>
    </div>
  );
}
