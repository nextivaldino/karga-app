import { Container, House, Package, Settings } from 'lucide-react';
import type { MainPage, ModuloPermissao } from '@/types';
import { useNavigation } from '@/hooks/useNavigation';
import { usePermissoes } from '@/hooks/usePermissoes';

const TABS: {
  page: MainPage;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  colorClass: string;
  modulo: ModuloPermissao | null;
}[] = [
  { page: 'home', label: 'Home', icon: House, colorClass: 'text-primary', modulo: null },
  { page: 'cargas', label: 'Cargas', icon: Package, colorClass: 'text-warning', modulo: 'cargas' },
  { page: 'contentores', label: 'Contentores', icon: Container, colorClass: 'text-success', modulo: 'contentores' },
  { page: 'configuracoes', label: 'Configurações', icon: Settings, colorClass: 'text-purple', modulo: 'configuracoes' },
];

export function MainTabs(): React.JSX.Element {
  const { page, navigate } = useNavigation();
  const { pode } = usePermissoes();

  return (
    <nav className="flex items-center gap-1">
      {TABS.filter((tab) => tab.modulo === null || pode(tab.modulo, 'ver')).map((tab) => {
        const Icon = tab.icon;
        const active = page === tab.page;
        return (
          <button
            key={tab.page}
            type="button"
            onClick={() => navigate(tab.page)}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className={`flex items-center gap-1.5 rounded-control px-3 py-1.5 text-[13px] font-medium transition-colors ${
              active ? 'bg-bg-app text-text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={18} />
            <span className={active ? tab.colorClass : ''}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
