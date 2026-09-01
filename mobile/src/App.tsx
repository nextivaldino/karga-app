import { useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import { NavigationProvider, useNavigation } from '@/hooks/useNavigation';
import { ToastContainer } from '@/components/ui/Toast';
import { BottomNav } from '@/components/BottomNav';
import { PasswordBanner } from '@/components/PasswordBanner';
import { LoginPage } from '@/pages/LoginPage';
import { TrocarPasswordPage } from '@/pages/TrocarPasswordPage';
import { HomePage } from '@/pages/HomePage';
import { ContentoresPage } from '@/pages/ContentoresPage';
import { CargasPage } from '@/pages/CargasPage';
import { MensagensPage } from '@/pages/MensagensPage';
import { ConfiguracoesPage } from '@/pages/ConfiguracoesPage';

function AppShell(): React.JSX.Element {
  const { loading, session, mustChangePassword } = useAuth();
  const { page } = useNavigation();
  const [trocarPasswordAberto, setTrocarPasswordAberto] = useState(false);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-[14px] text-text-tertiary">A carregar...</div>;
  }

  if (!session) return <LoginPage />;

  if (trocarPasswordAberto) {
    return <TrocarPasswordPage onCancel={() => setTrocarPasswordAberto(false)} onDone={() => setTrocarPasswordAberto(false)} />;
  }

  return (
    <div className="flex h-full flex-col">
      {mustChangePassword ? <PasswordBanner onAlterar={() => setTrocarPasswordAberto(true)} /> : null}
      <main className="flex-1 overflow-y-auto">
        {page === 'home' ? <HomePage /> : null}
        {page === 'contentores' ? <ContentoresPage /> : null}
        {page === 'cargas' ? <CargasPage /> : null}
        {page === 'mensagens' ? <MensagensPage /> : null}
        {page === 'configuracoes' ? <ConfiguracoesPage /> : null}
      </main>
      <BottomNav />
    </div>
  );
}

export default function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationProvider>
          <AppShell />
          <ToastContainer />
        </NavigationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
