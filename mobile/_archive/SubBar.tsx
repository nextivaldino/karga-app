import { useEffect, useRef, useState } from 'react';
import { CaretDown as ChevronDown, Funnel } from '@phosphor-icons/react';
import { useNavigation } from '@/hooks/useNavigation';
import { useCargasToolbar, OPCOES_FILTRO_ESTADO, type FiltroEstadoCarga } from '@/hooks/useCargasToolbar';
import { useContentorAtivo } from '@/hooks/useContentorAtivo';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { ESTADO_LABEL } from '@/lib/cargaEstado';
import { ContentorPickerSheet } from '@/components/ContentorPickerSheet';

const COR_ESTADO_FILTRO: Record<FiltroEstadoCarga, string> = {
  todas: '#71717a',
  pendente: '#f5a524',
  importada: '#17c964',
  rejeitada: '#f31260',
};

// SubBar da página Cargas: à esquerda, o contentor ativo — o mesmo
// definido pelo Karga Desktop (useContentorAtivo: atribuído pelo Admin >
// padrão global > primeiro aberto), com o nº de cargas desse contentor;
// toca para trocar, se houver mais do que um contentor aberto. Filtro de
// estado consolidado num único menu à direita.
function CargasSubBar(): React.JSX.Element {
  const { filtro, setFiltro, cargas } = useCargasToolbar();
  const { contentores, contentorAtivoId, selecionarContentor } = useContentorAtivo();
  const { fila } = useFilaOffline();
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const filtroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent): void {
      if (filtroRef.current && !filtroRef.current.contains(e.target as Node)) setFiltroAberto(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const contentorAtivo = contentorAtivoId ? contentores.find((c) => c.id === contentorAtivoId) : null;
  const totalContentorAtivo = contentorAtivoId
    ? cargas.filter((c) => c.contentorId === contentorAtivoId).length + fila.filter((f) => f.item.contentorId === contentorAtivoId).length
    : 0;

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-bg-app px-4 py-2.5">
      <button
        type="button"
        onClick={() => setSeletorAberto(true)}
        className="flex min-w-0 items-center gap-1.5 rounded-pill bg-bg-input px-3 py-1.5 text-left"
      >
        <span className="min-w-0 truncate text-[13px] font-semibold text-text-primary">
          {contentorAtivo ? contentorAtivo.codigo : 'Sem contentor'}
        </span>
        {contentorAtivo ? <span className="shrink-0 text-[11px] text-text-tertiary">· {totalContentorAtivo} cargas</span> : null}
        <ChevronDown size={13} className="shrink-0 text-text-tertiary" />
      </button>

      <div ref={filtroRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setFiltroAberto((v) => !v)}
          className={`flex h-8 items-center gap-1.5 rounded-pill px-3 text-[12.5px] font-medium transition-colors ${
            filtro !== 'todas' ? 'bg-primary text-white' : 'bg-bg-input text-text-secondary active:bg-border'
          }`}
        >
          <Funnel size={13} weight={filtro !== 'todas' ? 'fill' : 'regular'} />
          {filtro === 'todas' ? 'Filtrar' : ESTADO_LABEL[filtro]}
          <ChevronDown size={12} />
        </button>
        {filtroAberto ? (
          <div className="absolute right-0 top-10 z-50 w-44 overflow-hidden rounded-surface border border-border bg-bg-surface shadow-medium">
            {OPCOES_FILTRO_ESTADO.map((op) => {
              const selecionado = filtro === op;
              return (
                <button
                  key={op}
                  type="button"
                  onClick={() => {
                    setFiltro(op);
                    setFiltroAberto(false);
                  }}
                  className={`flex min-h-touch w-full items-center gap-2 px-3 text-left text-[13px] ${
                    selecionado ? 'bg-primary/10 font-semibold text-primary' : 'text-text-primary active:bg-bg-app'
                  }`}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COR_ESTADO_FILTRO[op] }} />
                  {op === 'todas' ? 'Todas' : ESTADO_LABEL[op]}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <ContentorPickerSheet
        open={seletorAberto}
        onClose={() => setSeletorAberto(false)}
        contentores={contentores}
        contentorAtivoId={contentorAtivoId}
        onSelecionar={selecionarContentor}
      />
    </div>
  );
}

// Sub-barra de contexto — fica logo abaixo do cabeçalho e muda consoante
// a página ativa, com as opções próprias dessa página. Páginas sem
// opções não mostram nada em vez de ficar uma barra vazia.
export function SubBar(): React.JSX.Element | null {
  const { page } = useNavigation();
  if (page === 'cargas') return <CargasSubBar />;
  return null;
}
