import { User as UserIcon } from '@phosphor-icons/react';

function ehImagem(avatar: string | null | undefined): boolean {
  return Boolean(avatar?.startsWith('data:image'));
}

interface UserAvatarProps {
  avatar: string | null | undefined;
  size?: number;
  className?: string;
}

// Leitura única do campo `User.avatar` (imagem base64, emoji, ou nulo) —
// usado em todo o lado onde um utilizador do desktop é representado
// (Home, login rápido, gestão de utilizadores), para não haver 3 cópias
// ligeiramente diferentes desta lógica a divergir ao longo do tempo.
export function UserAvatar({ avatar, size = 32, className = '' }: UserAvatarProps): React.JSX.Element {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-app ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
    >
      {ehImagem(avatar) ? (
        <img src={avatar ?? ''} alt="" className="h-full w-full object-cover" />
      ) : avatar ? (
        <span>{avatar}</span>
      ) : (
        <UserIcon size={Math.round(size * 0.55)} className="text-text-tertiary" />
      )}
    </span>
  );
}
