import { useEffect, useRef, useState } from 'react';
import { SquaresFour as LayoutGrid, List, SlidersHorizontal, X } from '@phosphor-icons/react';
import { useCargasToolbar, OPCOES_FILTRO_ESTADO, type FiltroEstadoCarga } from '@/hooks/useCargasToolbar';
import { useContentorAtivo } from '@/hooks/useContentorAtivo';
import { useTheme } from '@/hooks/useTheme';
import { estiloTema } from '@/lib/themeTokens';
import { ESTADO_LABEL } from '@/lib/cargaEstado';
import { ISLAND_MENU_TOP } from './DynamicIsland';

const COR_ESTADO_FILTRO: Record<FiltroEstadoCarga, string> = {
  todas: '#71717a',
  pendente: '#f5a524',
  importada: '#17c964',
  rejeitada: '#f31260',
};

// Bola logo a seguir à ilha dinâmica, só em Cargas — dá acesso às
// ferramentas da lista (vista + filtro de estado + contentor filtrado)
// sem as acumular dentro da própria ilha (que fica só com contentor
// ativo + notificações, igual em todas as páginas).
export function CargasToolsMenu(): React.JSX.Element {
  const { vista, setVista, filtro, setFiltro, contentorFiltroId, setContentorFiltroId } = useCargasToolbar();
  const { contentores } = useContentorAtivo();
  const contentorFiltro = contentorFiltroId ? contentores.find((c) => c.id === contentorFiltroId) : null;
  const { theme } = useTheme();
  const temaInvertido = theme === 'dark' ? 'light' : 'dark';
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const algumFiltroAtivo = filtro !== 'todas' || vista === 'grelha' || Boolean(contentorFiltro);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        title="Vista e filtro de Cargas"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
          algumFiltroAtivo ? 'bg-white text-primary' : 'bg-white/15 text-white'
        }`}
      >
        <SlidersHorizontal size={16} weight={algumFiltroAtivo ? 'bold' : 'regular'} />
      </button>

      {aberto ? (
        <div
          data-theme={temaInvertido}
          style={{ top: ISLAND_MENU_TOP, transformOrigin: 'top', ...estiloTema(temaInvertido) }}
          className="fixed inset-x-4 z-50 animate-[island-menu-in_0.2s_ease-out] overflow-hidden rounded-b-surface bg-bg-surface shadow-medium"
        >
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <span className="text-[13px] font-semibold text-text-primary">Vista e filtro</span>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="flex h-7 w-7 items-center justify-center rounded-control text-text-secondary active:bg-bg-app"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-3 p-3.5">
            {contentorFiltro ? (
              <button
                type="button"
                onClick={() => setContentorFiltroId(null)}
                className="flex min-h-touch items-center justify-between rounded-control bg-primary/10 px-3 text-left text-[13px] font-medium text-primary"
              >
                A mostrar só {contentorFiltro.codigo}
                <X size={14} />
              </button>
            ) : null}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setVista('lista')}
                className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-control text-[13px] font-medium ${
                  vista === 'lista' ? 'bg-primary text-white' : 'bg-bg-app text-text-secondary active:bg-border'
                }`}
              >
                <List size={15} /> Lista
              </button>
              <button
                type="button"
                onClick={() => setVista('grelha')}
                className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-control text-[13px] font-medium ${
                  vista === 'grelha' ? 'bg-primary text-white' : 'bg-bg-app text-text-secondary active:bg-border'
                }`}
              >
                <LayoutGrid size={15} /> Grelha
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Filtrar por estado</p>
              <div className="flex flex-col overflow-hidden rounded-control border border-border">
                {OPCOES_FILTRO_ESTADO.map((op, i) => {
                  const selecionado = filtro === op;
                  return (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setFiltro(op)}
                      className={`flex min-h-touch w-full items-center gap-2 px-3 text-left text-[13px] ${i > 0 ? 'border-t border-border' : ''} ${
                        selecionado ? 'bg-primary/10 font-semibold text-primary' : 'text-text-primary active:bg-bg-app'
                      }`}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COR_ESTADO_FILTRO[op] }} />
                      {op === 'todas' ? 'Todas' : ESTADO_LABEL[op]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
