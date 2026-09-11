import type { ReactNode } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { PinLockProvider } from '@/hooks/usePinLock';
import { ThemeProvider } from '@/hooks/useTheme';
import { NavigationProvider } from '@/hooks/useNavigation';
import { FilaOfflineProvider } from '@/hooks/useFilaOffline';
import { ContentorAtivoProvider } from '@/hooks/useContentorAtivo';
import { NotificationPanelProvider } from '@/hooks/useNotificationPanel';
import { CargasHubProvider } from '@/hooks/useCargasHub';
import { HubSheetProvider } from '@/hooks/useHubSheet';

// Junta os providers da app numa só árvore. Reset v02 (docs/26):
// CargasToolbarProvider/NovaCargaOverlayProvider (do painel antigo,
// agora em mobile/_archive/) saíram; entraram CargasHubProvider (dados
// partilhados + modo do hub) e HubSheetProvider (sistema de overlay
// único, docs/26 §8). Resto da árvore/ordem mantém-se.
export function AppProviders({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PinLockProvider>
          <FilaOfflineProvider>
            <ContentorAtivoProvider>
              <NavigationProvider>
                <NotificationPanelProvider>
                  <CargasHubProvider>
                    <HubSheetProvider>{children}</HubSheetProvider>
                  </CargasHubProvider>
                </NotificationPanelProvider>
              </NavigationProvider>
            </ContentorAtivoProvider>
          </FilaOfflineProvider>
        </PinLockProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
