import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/modules/auth/AuthContext';
import { ThemeProvider } from '@/hooks/useTheme';
import { NavigationProvider } from '@/hooks/useNavigation';
import { LicenseScreen } from '@/modules/auth/LicenseScreen';
import { SetupWizard } from '@/modules/auth/SetupWizard';
import { LoginScreen } from '@/modules/auth/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import { RootMaintenanceShell } from '@/modules/root/RootMaintenanceShell';
import { ipcService } from '@/services/ipcService';

function Gate(): React.JSX.Element {
  const { loading, setupNeeded, user } = useAuth();

  if (loading) return <div className="h-full bg-bg-app" />;
  if (setupNeeded) return <SetupWizard />;
  if (!user) return <LoginScreen />;
  if (user.role === 'root') return <RootMaintenanceShell />;

  return (
    <NavigationProvider>
      <AppShell />
    </NavigationProvider>
  );
}

function LicenseGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [activated, setActivated] = useState(false);
  const [machineId, setMachineId] = useState('');

  useEffect(() => {
    void ipcService.license.status().then((status) => {
      setActivated(status.activated);
      setMachineId(status.machineId);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="h-full bg-bg-app" />;
  if (!activated) return <LicenseScreen machineId={machineId} onActivated={() => setActivated(true)} />;

  return <>{children}</>;
}

export function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <LicenseGate>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </LicenseGate>
    </ThemeProvider>
  );
}
