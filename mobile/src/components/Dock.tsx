import { House, MessageCircle, Package, Plus } from 'lucide-react';
import { useNavigation, type MobilePage } from '@/hooks/useNavigation';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';

const ITENS: { page: MobilePage; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; colorClass: string }[] = [
  { page: 'home', label: 'Início', icon: House, colorClass: 'text-primary' },
  { page: 'cargas', label: 'Cargas', icon: Package, colorClass: 'text-success' },
  { page: 'mensagens', label: 'Mensagens', icon: MessageCircle, colorClass: 'text-purple' },
];

export function Dock(): React.JSX.Element {
  const { page, navigate } = useNavigation();
  const { abrir } = useNovaCargaOverlay();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <div className="pointer-events-auto flex items-center gap-1 rounded-pill border border-border bg-bg-surface px-2 py-1.5 shadow-lg">
        {ITENS.slice(0, 2).map((item) => (
          <DockButton key={item.page} item={item} active={page === item.page} onClick={() => navigate(item.page)} />
        ))}

        <button
          type="button"
          onClick={() => abrir()}
          title="Nova Carga"
          className="mx-1 flex h-14 w-14 -translate-y-3 items-center justify-center rounded-pill bg-primary text-white shadow-lg active:bg-primary-hover"
        >
          <Plus size={26} />
        </button>

        {ITENS.slice(2).map((item) => (
          <DockButton key={item.page} item={item} active={page === item.page} onClick={() => navigate(item.page)} />
        ))}
      </div>
    </div>
  );
}

function DockButton({
  item,
  active,
  onClick,
}: {
  item: (typeof ITENS)[number];
  active: boolean;
  onClick: () => void;
}): React.JSX.Element {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      title={item.label}
      className={`flex min-h-touch items-center gap-1.5 rounded-pill px-3 transition-all ${active ? 'bg-bg-app' : ''}`}
    >
      <Icon size={22} className={active ? item.colorClass : 'text-text-tertiary'} />
      {active ? <span className="text-[13px] font-medium text-text-primary">{item.label}</span> : null}
    </button>
  );
}
