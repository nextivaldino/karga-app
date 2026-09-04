import { House, Package, Plus } from '@phosphor-icons/react';
import { useNavigation, type MobilePage } from '@/hooks/useNavigation';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';
import { useTheme } from '@/hooks/useTheme';
import { estiloTema } from '@/lib/themeTokens';

const ITENS: { page: MobilePage; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; colorClass: string }[] = [
  { page: 'home', label: 'Início', icon: House, colorClass: 'text-primary' },
  { page: 'cargas', label: 'Cargas', icon: Package, colorClass: 'text-success' },
];

// A dock usa sempre o tema oposto ao da app (mesma lógica do popup Nova
// Carga — destaque de "primeiro plano") e um efeito translúcido tipo
// "liquid glass": fundo semitransparente + desfoque por trás.
export function Dock(): React.JSX.Element {
  const { page, navigate } = useNavigation();
  const { abrir } = useNovaCargaOverlay();
  const { theme } = useTheme();
  const temaInvertido = theme === 'dark' ? 'light' : 'dark';
  const tokens = estiloTema(temaInvertido) as Record<string, string>;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <div
        data-theme={temaInvertido}
        style={{ ...tokens, backgroundColor: `${tokens['--bg-surface']}b3` }}
        className="pointer-events-auto flex items-center gap-1 rounded-pill border border-border px-2 py-1.5 shadow-lg backdrop-blur-xl backdrop-saturate-150"
      >
        {ITENS.map((item) => (
          <DockButton key={item.page} item={item} active={page === item.page} onClick={() => navigate(item.page)} />
        ))}

        <button
          type="button"
          onClick={() => abrir()}
          title="Nova Carga"
          className="flex min-h-touch items-center gap-1.5 rounded-pill bg-primary px-3.5 text-white shadow-md transition-transform active:scale-95 active:bg-primary-hover"
        >
          <Plus size={22} />
        </button>
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
