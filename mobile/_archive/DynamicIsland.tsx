import { useState } from 'react';
import { ArrowsClockwise, Stack as Layers } from '@phosphor-icons/react';
import { useContentorAtivo } from '@/hooks/useContentorAtivo';
import { useNavigation } from '@/hooks/useNavigation';
import { useCargasToolbar } from '@/hooks/useCargasToolbar';
import { NotificationBell } from './NotificationBell';
import { ContentorPickerSheet } from './ContentorPickerSheet';

// Fundo do cabeçalho: safe-area + 10px (padding-top) + 48px (altura da
// ilha, h-12) + 10px (padding-bottom, pb-2.5). Os menus que "nascem" da
// ilha (notificações, seletor de contentor) encostam exatamente aqui —
// sem gap, para parecerem a mesma peça a crescer, não dois blocos.
export const ISLAND_MENU_TOP = 'calc(env(safe-area-inset-top) + 68px)';

// Contentor ativo — por omissão resolvido pelo servidor (atribuído pelo
// Admin > padrão global > primeiro aberto), mas tocável: com vários
// contentores abertos em simultâneo, o utilizador pode escolher outro na
// folha de seleção. A cor do ícone diz se veio mesmo do servidor ou é a
// última cópia em cache; o botão de reconectar fica à parte, só serve
// para forçar uma nova tentativa de ligação.
//
// Vive no cabeçalho global (Header.tsx) — a mesma ilha em todas as
// páginas, sempre com o mesmo conteúdo (contentor + notificações). As
// ferramentas específicas de Cargas (vista, filtro de estado) vivem na
// sua própria barra por cima do Dock (CargasToolsBar.tsx) — a ilha deixou
// de "crescer" por página para não acumular responsabilidades.
export function DynamicIsland(): React.JSX.Element | null {
  const { contentores, contentorAtivoId, ligado, aLigar, tentarLigar, selecionarContentor } = useContentorAtivo();
  const { navigate } = useNavigation();
  const { setContentorFiltroId } = useCargasToolbar();
  const [seletorAberto, setSeletorAberto] = useState(false);
  const atual = contentores.find((c) => c.id === contentorAtivoId) ?? null;
  if (!atual) return null;

  return (
    <>
      {/* Estilo "Dynamic Island": escuro fixo (não segue o tema claro/escuro
          da app, tal como o elemento da Apple), flutuante e centrado na
          barra — junta o seletor de contentor e as notificações/mensagens
          num só elemento. */}
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

        <div className="flex min-w-0 flex-1 items-center justify-end overflow-hidden">
          <NotificationBell fixedTop={ISLAND_MENU_TOP} compacta={false} />
        </div>
      </div>

      <ContentorPickerSheet
        open={seletorAberto}
        onClose={() => setSeletorAberto(false)}
        contentores={contentores}
        contentorAtivoId={contentorAtivoId}
        onSelecionar={(id) => {
          selecionarContentor(id);
          // Escolher um contentor aqui (seletor global do cabeçalho) leva
          // logo à lista desse contentor — diferente do seletor dentro do
          // Nova Carga, que só define o contentor da carga a criar.
          setContentorFiltroId(id);
          navigate('cargas');
        }}
        variant="dropdown"
        topOffset={ISLAND_MENU_TOP}
      />
    </>
  );
}
