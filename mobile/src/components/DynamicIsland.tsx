import { useEffect, useRef, useState } from 'react';
import { ArrowsClockwise, Funnel, SquaresFour as LayoutGrid, List, Stack as Layers } from '@phosphor-icons/react';
import { useContentorAtivo } from '@/hooks/useContentorAtivo';
import { useNavigation } from '@/hooks/useNavigation';
import { useCargasToolbar, OPCOES_FILTRO_ESTADO, type FiltroEstadoCarga } from '@/hooks/useCargasToolbar';
import { useTheme } from '@/hooks/useTheme';
import { estiloTema } from '@/lib/themeTokens';
import { ESTADO_LABEL } from '@/lib/cargaEstado';
import { corTextoSobre } from '@/lib/rowAccents';

const COR_ESTADO_FILTRO: Record<FiltroEstadoCarga, string> = {
  todas: '#71717a',
  pendente: '#f5a524',
  importada: '#17c964',
  rejeitada: '#f31260',
};
import { NotificationBell } from './NotificationBell';
import { ContentorPickerSheet } from './ContentorPickerSheet';

// Fundo do cabeçalho: safe-area + 10px (padding-top) + 48px (altura da
// ilha, h-12) + 10px (padding-bottom, pb-2.5). Os menus que "nascem" da
// ilha (notificações, seletor de contentor, filtro) encostam exatamente
// aqui — sem gap, para parecerem a mesma peça a crescer, não dois blocos.
export const ISLAND_MENU_TOP = 'calc(env(safe-area-inset-top) + 68px)';

// Segmented control lista/grelha + filtro de estado — só aparece dentro da
// ilha quando a página ativa é Cargas. Substitui a barra de ferramentas que
// antes vivia no corpo da página: a ilha agora "cresce" por página em vez
// de ser sempre igual em toda a app.
function CargasControlsIsland(): React.JSX.Element {
  const { vista, setVista, filtro, setFiltro } = useCargasToolbar();
  const { theme } = useTheme();
  const temaInvertido = theme === 'dark' ? 'light' : 'dark';
  const [filtroAberto, setFiltroAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setFiltroAberto(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={() => setVista('lista')}
        title="Vista em lista"
        className={`flex h-7 w-7 items-center justify-center rounded-full ${vista === 'lista' ? 'bg-white/15 text-white' : 'text-white/60'}`}
      >
        <List size={14} />
      </button>
      <button
        type="button"
        onClick={() => setVista('grelha')}
        title="Vista em grelha"
        className={`flex h-7 w-7 items-center justify-center rounded-full ${vista === 'grelha' ? 'bg-white/15 text-white' : 'text-white/60'}`}
      >
        <LayoutGrid size={14} />
      </button>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setFiltroAberto((v) => !v)}
          title="Filtrar por estado"
          className={`flex h-7 w-7 items-center justify-center rounded-full ${filtro !== 'todas' ? 'bg-white/15 text-white' : 'text-white/60'}`}
        >
          <Funnel size={14} weight={filtro !== 'todas' ? 'fill' : 'regular'} />
        </button>
        {filtroAberto ? (
          <div
            data-theme={temaInvertido}
            style={{ top: ISLAND_MENU_TOP, transformOrigin: 'top', ...estiloTema(temaInvertido) }}
            className="fixed right-4 z-50 w-44 animate-[island-menu-in_0.2s_ease-out] overflow-hidden rounded-surface bg-bg-surface shadow-medium"
          >
            {OPCOES_FILTRO_ESTADO.map((op: FiltroEstadoCarga) => {
              const selecionado = filtro === op;
              return (
                <button
                  key={op}
                  type="button"
                  onClick={() => {
                    setFiltro(op);
                    setFiltroAberto(false);
                  }}
                  style={selecionado ? { backgroundColor: '#006fee', color: '#ffffff' } : undefined}
                  className={`flex min-h-touch w-full items-center gap-2 px-3 text-left text-[13px] ${
                    selecionado ? 'font-semibold' : 'text-text-primary active:bg-bg-app'
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: selecionado ? corTextoSobre('#006fee') : COR_ESTADO_FILTRO[op] }}
                  />
                  {op === 'todas' ? 'Todas' : ESTADO_LABEL[op]}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Contentor ativo — por omissão resolvido pelo servidor (atribuído pelo
// Admin > padrão global > primeiro aberto), mas tocável: com vários
// contentores abertos em simultâneo, o utilizador pode escolher outro na
// folha de seleção. A cor do ícone diz se veio mesmo do servidor ou é a
// última cópia em cache; o botão de reconectar fica à parte, só serve
// para forçar uma nova tentativa de ligação.
//
// Vive no cabeçalho global (Header.tsx) — a mesma ilha em todas as
// páginas — mas adapta o conteúdo do meio consoante a página ativa
// (ChevronDown/filtro em Cargas, nada em Home/Definições).
export function DynamicIsland(): React.JSX.Element | null {
  const { contentores, contentorAtivoId, ligado, aLigar, tentarLigar, selecionarContentor } = useContentorAtivo();
  const { page } = useNavigation();
  const [seletorAberto, setSeletorAberto] = useState(false);
  const atual = contentores.find((c) => c.id === contentorAtivoId) ?? null;
  if (!atual) return null;

  const emCargas = page === 'cargas';

  return (
    <>
      {/* Estilo "Dynamic Island": escuro fixo (não segue o tema claro/escuro
          da app, tal como o elemento da Apple), flutuante e centrado na
          barra — junta o seletor de contentor, os controlos da página ativa
          (quando existem) e as notificações/mensagens num só elemento. */}
      <div className="flex h-12 min-w-0 max-w-[400px] flex-1 items-center gap-2 rounded-pill bg-[#1c1c1e] pl-4 pr-3 shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
        <button
          type="button"
          onClick={() => setSeletorAberto(true)}
          className="flex min-w-0 shrink items-center gap-1.5 py-1 text-left"
        >
          <Layers size={16} className={`shrink-0 ${ligado ? 'text-success' : 'text-warning'}`} />
          <span className="min-w-0 truncate text-[14px] font-medium text-white">{atual.codigo}</span>
        </button>
        {!ligado ? (
          <button
            type="button"
            onClick={() => void tentarLigar()}
            disabled={aLigar}
            title="Sem ligação ao servidor — a mostrar a última lista guardada. Toca para tentar de novo."
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-warning active:bg-white/10 disabled:opacity-60"
          >
            <ArrowsClockwise size={14} className={aLigar ? 'animate-spin' : ''} />
          </button>
        ) : null}
        <span className="h-5 w-px shrink-0 bg-white/20" />

        {emCargas ? (
          <>
            <CargasControlsIsland />
            <span className="h-5 w-px shrink-0 bg-white/20" />
          </>
        ) : null}

        {/* A área de notificação cresce para caber o título (ex: "Carga
            sincronizada") quando há espaço livre (Home/Definições); em
            Cargas, com a zona do meio ocupada, encolhe para ícone+ponto. */}
        <div className={`flex min-w-0 items-center justify-end overflow-hidden ${emCargas ? 'shrink-0' : 'flex-1'}`}>
          <NotificationBell fixedTop={ISLAND_MENU_TOP} compacta={emCargas} />
        </div>
      </div>

      <ContentorPickerSheet
        open={seletorAberto}
        onClose={() => setSeletorAberto(false)}
        contentores={contentores}
        contentorAtivoId={contentorAtivoId}
        onSelecionar={selecionarContentor}
        variant="dropdown"
        topOffset={ISLAND_MENU_TOP}
      />
    </>
  );
}
