import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePinLock } from '@/hooks/usePinLock';
import { useNavigation } from '@/hooks/useNavigation';
import { ToastContainer } from '@/components/ui/Toast';
import { AppProviders } from '@/components/AppProviders';
import { CargasHubPage } from '@/pages/CargasHubPage';
import { LoginPage } from '@/pages/LoginPage';
import { TrocarPasswordPage } from '@/pages/TrocarPasswordPage';
import { DefinicoesPage } from '@/pages/DefinicoesPage';
import { RootPanelPage } from '@/pages/RootPanelPage';
import { PinUnlockPage } from '@/pages/PinUnlockPage';

// Reset v02 (docs/26 §1-§2): Cargas é a única rota pós-login — hub
// central onde tudo (menu, notificações, sync, ações) acontece via
// pop-ups e a ilha dinâmica, não em páginas separadas. Definições é a
// única outra página, só alcançável pelo menu da ilha.
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

  if (page === 'definicoes') {
    return <DefinicoesPage onTrocarPassword={() => setTrocarPasswordAberto(true)} />;
  }

  return <CargasHubPage />;
}

export default function App(): React.JSX.Element {
  return (
    <AppProviders>
      <AppShell />
      <ToastContainer />
    </AppProviders>
  );
}
