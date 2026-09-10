import { useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { PinLockProvider, usePinLock } from '@/hooks/usePinLock';
import { ThemeProvider } from '@/hooks/useTheme';
import { NavigationProvider, useNavigation } from '@/hooks/useNavigation';
import { NovaCargaOverlayProvider } from '@/hooks/useNovaCargaOverlay';
import { FilaOfflineProvider } from '@/hooks/useFilaOffline';
import { ContentorAtivoProvider } from '@/hooks/useContentorAtivo';
import { NotificationPanelProvider } from '@/hooks/useNotificationPanel';
import { CargasToolbarProvider } from '@/hooks/useCargasToolbar';
import { ToastContainer } from '@/components/ui/Toast';
import { PasswordBanner } from '@/components/PasswordBanner';
import { Header } from '@/components/Header';
import { Dock } from '@/components/Dock';
import { NovaCargaOverlay } from '@/components/NovaCargaOverlay';
import { LoginPage } from '@/pages/LoginPage';
import { TrocarPasswordPage } from '@/pages/TrocarPasswordPage';
import { HomePage } from '@/pages/HomePage';
import { CargasPage } from '@/pages/CargasPage';
import { DefinicoesPage } from '@/pages/DefinicoesPage';
import { RootPanelPage } from '@/pages/RootPanelPage';
import { PinUnlockPage } from '@/pages/PinUnlockPage';

function AppShell(): React.JSX.Element {
  const { loading, session, mustChangePassword, pwaUser } = useAuth();
  const { bloqueado } = usePinLock();
  const { page } = useNavigation();
  const [trocarPasswordAberto, setTrocarPasswordAberto] = useState(false);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-[14px] text-text-tertiary">A carregar...</div>;
  }

  if (!session) return <LoginPage />;

  if (bloqueado) return <PinUnlockPage />;

  if (trocarPasswordAberto) {
    return <TrocarPasswordPage onCancel={() => setTrocarPasswordAberto(false)} onDone={() => setTrocarPasswordAberto(false)} />;
  }

  if (mustChangePassword) {
    return <TrocarPasswordPage onCancel={() => undefined} onDone={() => undefined} />;
  }

  if (pwaUser?.tipoAcesso === 'root') return <RootPanelPage />;

  return (
    <div className="flex h-full flex-col">
      <Header />
      {mustChangePassword ? <PasswordBanner onAlterar={() => setTrocarPasswordAberto(true)} /> : null}
      <main className="flex-1 overflow-y-auto pb-24">
        {page === 'home' ? <HomePage /> : null}
        {page === 'cargas' ? <CargasPage /> : null}
        {page === 'definicoes' ? <DefinicoesPage onTrocarPassword={() => setTrocarPasswordAberto(true)} /> : null}
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
        <PinLockProvider>
          <FilaOfflineProvider>
            <ContentorAtivoProvider>
              <NavigationProvider>
                <NovaCargaOverlayProvider>
                  <NotificationPanelProvider>
                    <CargasToolbarProvider>
                      <AppShell />
                      <ToastContainer />
                    </CargasToolbarProvider>
                  </NotificationPanelProvider>
                </NovaCargaOverlayProvider>
              </NavigationProvider>
            </ContentorAtivoProvider>
          </FilaOfflineProvider>
        </PinLockProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
