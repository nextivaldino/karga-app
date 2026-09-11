import { House, Package, UsersThree, Gear, type Icon as PhosphorIcon } from '@phosphor-icons/react';
import { useNavigation, type MobilePage } from '@/hooks/useNavigation';

const ITENS: { page: MobilePage; label: string; icon: PhosphorIcon }[] = [
  { page: 'home', label: 'Início', icon: House },
  { page: 'cargas', label: 'Cargas', icon: Package },
  { page: 'contactos', label: 'Contactos', icon: UsersThree },
  { page: 'definicoes', label: 'Definições', icon: Gear },
];

// Barra de abas plana, de largura total, encostada ao fundo — estilo
// nativo (Notas/Lembretes da Apple), não uma cápsula flutuante. Substitui
// o antigo Dock.tsx (arquivado, mobile/_archive/Dock.tsx). O botão "Nova
// Carga" saiu daqui — vive à parte, em NovaCargaFab.tsx.
export function TabBar(): React.JSX.Element {
  const { page, navigate } = useNavigation();

  return (
    <div className="flex shrink-0 items-stretch border-t border-border bg-bg-app" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {ITENS.map((item) => {
        const Icon = item.icon;
        const ativo = page === item.page;
        return (
          <button
            key={item.page}
            type="button"
            onClick={() => navigate(item.page)}
            className="flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 py-2"
          >
            <Icon size={23} weight={ativo ? 'fill' : 'regular'} className={ativo ? 'text-primary' : 'text-text-tertiary'} />
            <span className={`text-[10px] font-medium ${ativo ? 'text-primary' : 'text-text-tertiary'}`}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
