import { Plus } from '@phosphor-icons/react';

interface FabProps {
  pendente: boolean;
  badge: number;
  escondido: boolean;
  onClick: () => void;
}

// Botão flutuante dinâmico (docs/26 §6) — normal (gradiente cobre) /
// pendente de sync (gradiente âmbar + badge) / escondido no scroll (o
// scroll é detetado por quem usa este componente — CargasHubPage — e
// passado aqui via `escondido`, mantendo este componente só visual).
export function Fab({ pendente, badge, escondido, onClick }: FabProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={pendente ? 'Sincronização pendente' : 'Nova carga'}
      className="fixed bottom-[34px] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full"
      style={{
        background: pendente ? 'linear-gradient(150deg, #F0BE6E, var(--amber))' : 'linear-gradient(150deg, var(--copper-strong), var(--copper))',
        boxShadow: pendente
          ? '0 10px 24px -6px rgba(227,172,78,0.6), inset 0 1px 1px rgba(255,255,255,0.35)'
          : '0 10px 24px -6px rgba(200,147,97,0.55), inset 0 1px 1px rgba(255,255,255,0.35)',
        transform: escondido ? 'translateY(120px) scale(0.7)' : 'translateY(0) scale(1)',
        opacity: escondido ? 0 : 1,
        pointerEvents: escondido ? 'none' : 'auto',
        transition: 'transform .38s cubic-bezier(.32,.9,.35,1), opacity .3s ease, background .3s ease, box-shadow .3s ease',
      }}
    >
      <Plus size={24} weight="bold" color="#241609" />
      {badge > 0 ? (
        <span
          className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 px-1 text-[10px] font-bold text-white"
          style={{ background: 'var(--red)', borderColor: 'var(--surface-bot)' }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
