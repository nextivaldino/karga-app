import { ModuleIcon } from '@/components/icons/ModuleIcon';
import { MainTabs } from './MainTabs';
import { HeaderSearch } from './HeaderSearch';
import { HeaderUserMenu } from './HeaderUserMenu';
import { MensagensBell } from './MensagensBell';
import { NotificacoesBell } from './NotificacoesBell';
import { StatusBar } from './StatusBar';
import { ToastContainer } from '@/components/ui/Toast';
import { useNavigation } from '@/hooks/useNavigation';
import { StatusBarProvider } from '@/hooks/useStatusBarText';
import { Home } from '@/pages/Home';
import { Cargas } from '@/pages/Cargas';
import { Contentores } from '@/pages/Contentores';
import { Configuracoes } from '@/pages/Configuracoes';
import { Sync } from '@/pages/Sync';
import { SincronizacaoLoginModal } from '@/modules/home/SincronizacaoLoginModal';

const PAGES = {
  home: Home,
  cargas: Cargas,
  contentores: Contentores,
  configuracoes: Configuracoes,
  sync: Sync,
};

const IS_MAC = window.kraga.platform === 'darwin';

export function AppShell(): React.JSX.Element {
  const { page } = useNavigation();
  const ActivePage = PAGES[page];

  return (
    <StatusBarProvider>
      <div className="flex h-full flex-col">
        <header
        // Sem rebordo em nenhuma página — uma linha aqui cortaria mesmo por
        // cima do "flare" da base da aba ativa (MainTabs), quebrando a
        // fusão de cor com o ContextToolbar por baixo. A transição nas
        // zonas SEM aba ativa por cima já fica visualmente definida pelo
        // próprio degrau de cor entre --bg-header e o fundo do
        // ContextToolbar. Nota: nem sequer um `border-transparent` pode
        // entrar aqui — com box-sizing:border-box isso ainda reserva 1px
        // de altura real (só sem cor), o que fazia o `nav` (h-12, 48px)
        // ficar centrado num espaço de 47px e sobrar 0.5px partido no
        // topo e na base — a fresta fina que separava a aba da sub-barra.
        // `backdrop-blur-md` cria o seu próprio stacking context (é um
        // backdrop-filter). Sem um `z-index` explícito aqui, esse
        // contexto inteiro pinta-se ANTES do <main> a seguir no DOM —
        // nenhum z-index dentro dos popovers do cabeçalho (sinos, etc.)
        // consegue escapar a essa ordem. `relative z-10` resolve de vez,
        // em vez de continuar a subir o z-index de cada popover um a um.
        // Grid em vez de flex+justify-between: com 2 colunas laterais
        // `1fr` (iguais por definição, independentemente do que cada
        // lado contém), a coluna do meio (`auto`, só a largura do
        // MainTabs) fica SEMPRE matematicamente centrada no cabeçalho —
        // já não depende de manter duas larguras fixas em pixels em
        // sincronia (`HEADER_SIDE_WIDTH`), o que partia sempre que um
        // dos lados ganhava mais conteúdo (ex: o campo de pesquisa).
        className="relative z-10 grid h-[var(--chrome-header-h)] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 bg-bg-header px-lg backdrop-blur-md"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: IS_MAC ? 70 : 0 }}>
          <ModuleIcon module="kraga" size={16} className="shrink-0" />
          <span className="text-[13px] font-semibold text-text-primary">Kraga Desktop</span>
        </div>

        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <MainTabs />
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* Preenche o espaço livre entre o fim das abas e os ícones,
              centrando o campo de pesquisa nesse vão — "no meio entre a
              aba Sync e o menu de hambúrguer". */}
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <HeaderSearch />
          </div>

          <MensagensBell />
          <NotificacoesBell />

          <div className="mx-1.5 h-5 w-px shrink-0 bg-border" />

          <HeaderUserMenu />
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <ActivePage />
      </main>

      <StatusBar />
      <ToastContainer />
      <SincronizacaoLoginModal />
    </div>
    </StatusBarProvider>
  );
}
