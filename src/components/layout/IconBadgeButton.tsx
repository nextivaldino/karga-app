import type { Icon } from '@phosphor-icons/react';

interface IconBadgeButtonProps {
  icon: Icon;
  iconSize?: number;
  badgeCount?: number;
  badgeColorClass?: string;
  active?: boolean;
  title?: string;
  onClick: () => void;
}

// Botão de utilidade do cabeçalho (sinos de notificações/sincronização,
// etc.) com badge numérico — casca partilhada para o tamanho, a posição
// do badge e o estado "aberto" ficarem sempre iguais, em vez de cada sino
// reimplementar os mesmos pixels.
export function IconBadgeButton({
  icon: IconCmp,
  iconSize = 18,
  badgeCount,
  badgeColorClass = 'bg-error',
  active = false,
  title,
  onClick,
}: IconBadgeButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      className={`relative flex h-[var(--chrome-icon-btn)] w-[var(--chrome-icon-btn)] items-center justify-center rounded-control transition-colors ${
        active ? 'bg-bg-app text-text-primary' : 'text-text-secondary hover:bg-bg-app'
      }`}
    >
      <IconCmp size={iconSize} />
      {badgeCount != null && badgeCount > 0 ? (
        <span
          className={`absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill px-1 text-[9px] font-semibold text-white ${badgeColorClass}`}
        >
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      ) : null}
    </button>
  );
}
