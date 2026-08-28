import { Container, House, MessageCircle, Package, Settings } from 'lucide-react';
import { useNavigation, type MobilePage } from '@/hooks/useNavigation';

const TABS: {
  page: MobilePage;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  colorClass: string;
}[] = [
  { page: 'home', label: 'Início', icon: House, colorClass: 'text-primary' },
  { page: 'contentores', label: 'Contentores', icon: Container, colorClass: 'text-success' },
  { page: 'cargas', label: 'Cargas', icon: Package, colorClass: 'text-warning' },
  { page: 'mensagens', label: 'Mensagens', icon: MessageCircle, colorClass: 'text-purple' },
  { page: 'configuracoes', label: 'Config.', icon: Settings, colorClass: 'text-text-secondary' },
];

export function BottomNav(): React.JSX.Element {
  const { page, navigate } = useNavigation();

  return (
    <nav
      className="flex shrink-0 items-stretch border-t border-border bg-bg-header backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = page === tab.page;
        return (
          <button
            key={tab.page}
            type="button"
            onClick={() => navigate(tab.page)}
            className="flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 py-1.5"
          >
            <Icon size={22} className={active ? tab.colorClass : 'text-text-tertiary'} />
            <span className={`text-[11px] font-medium ${active ? 'text-text-primary' : 'text-text-tertiary'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
