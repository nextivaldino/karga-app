import { LogOut, Moon, Search, Sun } from 'lucide-react';
import { MainTabs } from './MainTabs';
import { GlobalSearch } from './GlobalSearch';
import { NotificacoesBell } from './NotificacoesBell';
import { StatusBar } from './StatusBar';
import { ToastContainer } from '@/components/ui/Toast';
import { useAuth } from '@/modules/auth/AuthContext';
import { useNavigation } from '@/hooks/useNavigation';
import { useTheme } from '@/hooks/useTheme';
import { Home } from '@/pages/Home';
import { Cargas } from '@/pages/Cargas';
import { Contentores } from '@/pages/Contentores';
import { Configuracoes } from '@/pages/Configuracoes';

const PAGES = {
  home: Home,
  cargas: Cargas,
  contentores: Contentores,
  configuracoes: Configuracoes,
};

const IS_MAC = window.kraga.platform === 'darwin';
const HEADER_SIDE_WIDTH = IS_MAC ? 210 : 140;

export function AppShell(): React.JSX.Element {
  const { user, logout } = useAuth();
  const { page } = useNavigation();
  const { theme, setTheme } = useTheme();
  const ActivePage = PAGES[page];

  return (
    <div className="flex h-full flex-col">
      <header
        className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-bg-header px-lg backdrop-blur-md"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div
          className="text-[13px] font-semibold text-text-primary"
          style={{ width: HEADER_SIDE_WIDTH, paddingLeft: IS_MAC ? 70 : 0 }}
        >
          Kraga Desktop
        </div>

        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <MainTabs />
        </div>

        <div
          className="flex items-center justify-end gap-1"
          style={{ width: HEADER_SIDE_WIDTH, WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            type="button"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            title="Pesquisar (Cmd+K)"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="flex h-8 w-8 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
          >
            <Search size={18} />
          </button>
          <button
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="flex h-8 w-8 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <NotificacoesBell />
          <button
            type="button"
            onClick={() => void logout()}
            title={user ? `Sair (${user.name})` : 'Sair'}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="flex h-8 w-8 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <ActivePage />
      </main>

      <StatusBar />
      <GlobalSearch />
      <ToastContainer />
    </div>
  );
}
