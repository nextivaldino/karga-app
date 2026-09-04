import { useTopBarSlotContent } from '@/hooks/useTopBarSlot';
import { GearMenu } from './GearMenu';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  onTrocarPassword: () => void;
}

// Barra dinâmica única — o lado esquerdo muda por página (título +
// controlos próprios, publicados via useTopBarSlot); o lado direito é
// fixo em toda a app. O indicador online e o atalho de Mensagens saíram
// daqui — mensagens agora só vivem dentro do sino de notificações, que já
// as mistura com o resto dos avisos (doc 20 §5).
export function Header({ onTrocarPassword }: HeaderProps): React.JSX.Element {
  const conteudo = useTopBarSlotContent();

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-bg-header px-4 backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center gap-2">{conteudo}</div>
      <div className="flex shrink-0 items-center gap-1">
        <NotificationBell />
        <GearMenu onTrocarPassword={onTrocarPassword} />
      </div>
    </header>
  );
}
