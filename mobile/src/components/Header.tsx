import { Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTopBarSlotContent } from '@/hooks/useTopBarSlot';
import { GearMenu } from './GearMenu';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  onTrocarPassword: () => void;
}

// Barra dinâmica única — o lado esquerdo muda por página (título +
// controlos próprios, publicados via useTopBarSlot); o lado direito é
// fixo em toda a app (online, notificações, engrenagem).
export function Header({ onTrocarPassword }: HeaderProps): React.JSX.Element {
  const online = useOnlineStatus();
  const conteudo = useTopBarSlotContent();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-bg-header px-4 backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center gap-2">{conteudo}</div>
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
