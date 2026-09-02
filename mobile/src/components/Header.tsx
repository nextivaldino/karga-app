import { Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { GearMenu } from './GearMenu';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  onTrocarPassword: () => void;
}

export function Header({ onTrocarPassword }: HeaderProps): React.JSX.Element {
  const { pwaUser } = useAuth();
  const online = useOnlineStatus();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg-header px-4 backdrop-blur-md">
      <span className="truncate text-[16px] font-semibold text-text-primary">Olá, {pwaUser?.nome ?? '...'} 👋</span>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-pill ${online ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}
          title={online ? 'Online' : 'Sem ligação'}
        >
          {online ? <Wifi size={14} /> : <WifiOff size={14} />}
        </span>
        <NotificationBell />
        <GearMenu onTrocarPassword={onTrocarPassword} />
      </div>
    </header>
  );
}
