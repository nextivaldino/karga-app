import { Gear, SignOut, UsersThree, X } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';

interface MenuLateralProps {
  open: boolean;
  onClose: () => void;
}

// Drawer lateral (substitui o antigo GearMenu de ícone único, que só
// abria Definições) — ponto de entrada único para Contactos, Definições
// e Sair. Contactos ainda não tem página própria (chega em 27e); navegar
// para lá por agora mostra um ecrã "Em breve" (ver App.tsx).
export function MenuLateral({ open, onClose }: MenuLateralProps): React.JSX.Element | null {
  const { navigate } = useNavigation();
  const { logout } = useAuth();
  if (!open) return null;

  function ir(page: 'contactos' | 'definicoes'): void {
    navigate(page);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-[78%] max-w-[300px] flex-col bg-bg-surface shadow-2xl"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <img src="/karga-logo.svg" alt="Karga" className="h-5 w-5" />
          </span>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-control text-text-secondary active:bg-bg-app"
          >
            <X size={19} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          <button
            type="button"
            onClick={() => ir('contactos')}
            className="flex min-h-touch items-center gap-3 rounded-control px-3 text-left text-[15px] font-medium text-text-primary active:bg-bg-app"
          >
            <UsersThree size={20} className="text-text-secondary" /> Contactos
          </button>
          <button
            type="button"
            onClick={() => ir('definicoes')}
            className="flex min-h-touch items-center gap-3 rounded-control px-3 text-left text-[15px] font-medium text-text-primary active:bg-bg-app"
          >
            <Gear size={20} className="text-text-secondary" /> Definições
          </button>
        </nav>

        <div className="border-t border-border px-3 pt-3">
          <button
            type="button"
            onClick={() => void logout()}
            className="flex min-h-touch w-full items-center gap-3 rounded-control px-3 text-left text-[15px] font-medium text-error active:bg-error/10"
          >
            <SignOut size={20} /> Sair
          </button>
        </div>
      </div>
    </div>
  );
}
