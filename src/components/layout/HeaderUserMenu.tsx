import { useEffect, useRef, useState } from 'react';
import { CaretRight, Gear, Info, List, Moon, SignOut as LogOut, Sun } from '@phosphor-icons/react';
import { useAuth } from '@/modules/auth/AuthContext';
import { useNavigation } from '@/hooks/useNavigation';
import { useTheme } from '@/hooks/useTheme';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { SobreModal } from './SobreModal';

// Substitui o antigo par solto de ícones (tema + sair) por um único
// menu de hambúrguer — agrupa tema, perfil/definições e sessão num só
// sítio, ao estilo do menu de conta do Finder/macOS.
export function HeaderUserMenu(): React.JSX.Element {
  const { user, logout } = useAuth();
  const { navigate } = useNavigation();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [sobreAberto, setSobreAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={user ? user.name : 'Menu'}
        className={`flex h-[var(--chrome-icon-btn)] w-[var(--chrome-icon-btn)] items-center justify-center rounded-control text-text-secondary transition-colors ${
          open ? 'bg-bg-app text-text-primary' : 'hover:bg-bg-app'
        }`}
      >
        <List size={18} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-surface border border-border bg-bg-surface shadow-lg">
          {user ? (
            <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
              <UserAvatar avatar={user.avatar} size={32} />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-text-primary">{user.name}</p>
                <p className="truncate text-[11px] text-text-tertiary">{user.email}</p>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-[13px] text-text-primary transition-colors hover:bg-bg-app"
          >
            <span className="flex items-center gap-2.5">
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              Tema {theme === 'light' ? 'escuro' : 'claro'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('configuracoes', user ? { userId: user.id } : undefined);
            }}
            className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-[13px] text-text-primary transition-colors hover:bg-bg-app"
          >
            <span className="flex items-center gap-2.5">
              <Gear size={16} />
              Perfil e Definições
            </span>
            <CaretRight size={13} className="text-text-tertiary" />
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setSobreAberto(true);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-text-primary transition-colors hover:bg-bg-app"
          >
            <Info size={16} />
            Sobre o Karga
          </button>

          <div className="h-px bg-border" />

          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-error transition-colors hover:bg-error/10"
          >
            <LogOut size={16} />
            Sair{user ? ` (${user.name})` : ''}
          </button>
        </div>
      ) : null}

      <SobreModal open={sobreAberto} onClose={() => setSobreAberto(false)} />
    </div>
  );
}
