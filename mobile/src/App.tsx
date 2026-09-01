import { useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import { NavigationProvider, useNavigation } from '@/hooks/useNavigation';
import { NovaCargaOverlayProvider } from '@/hooks/useNovaCargaOverlay';
import { FilaOfflineProvider, useFilaOffline } from '@/hooks/useFilaOffline';
import { ToastContainer } from '@/components/ui/Toast';
import { PasswordBanner } from '@/components/PasswordBanner';
import { Header } from '@/components/Header';
import { Dock } from '@/components/Dock';
import { NovaCargaOverlay } from '@/components/NovaCargaOverlay';
import { LoginPage } from '@/pages/LoginPage';
import { TrocarPasswordPage } from '@/pages/TrocarPasswordPage';
import { HomePage } from '@/pages/HomePage';
import { CargasPage } from '@/pages/CargasPage';
import { MensagensPage } from '@/pages/MensagensPage';

function AProcessarFilaBanner(): React.JSX.Element | null {
  const { aProcessar, fila } = useFilaOffline();
  if (!aProcessar) return null;
  return (
    <div className="border-b border-border bg-primary-light px-4 py-2 text-center text-[13px] font-medium text-primary">
      A enviar {fila.length} carga{fila.length === 1 ? '' : 's'}...
    </div>
  );
}

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
      <Header onTrocarPassword={() => setTrocarPasswordAberto(true)} />
      {mustChangePassword ? <PasswordBanner onAlterar={() => setTrocarPasswordAberto(true)} /> : null}
      <AProcessarFilaBanner />
      <main className="flex-1 overflow-y-auto pb-24">
        {page === 'home' ? <HomePage /> : null}
        {page === 'cargas' ? <CargasPage /> : null}
        {page === 'mensagens' ? <MensagensPage /> : null}
      </main>
      <Dock />
      <NovaCargaOverlay />
    </div>
  );
}

export default function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FilaOfflineProvider>
          <NavigationProvider>
            <NovaCargaOverlayProvider>
              <AppShell />
              <ToastContainer />
            </NovaCargaOverlayProvider>
          </NavigationProvider>
        </FilaOfflineProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
