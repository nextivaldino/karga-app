import { useEffect, useRef, useState } from 'react';
import { Info, Key as KeyRound, SignOut as LogOut, Moon, Gear as Settings, Sun } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';

interface GearMenuProps {
  onTrocarPassword: () => void;
}

export function GearMenu({ onTrocarPassword }: GearMenuProps): React.JSX.Element {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [sobreAberto, setSobreAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Menu"
        className="flex h-9 w-9 items-center justify-center rounded-control text-text-secondary active:bg-bg-app"
      >
        <Settings size={20} />
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-surface border border-border bg-bg-surface shadow-lg">
          <button
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="flex min-h-touch w-full items-center gap-3 px-4 text-left text-[14px] text-text-primary active:bg-bg-app"
          >
            {theme === 'light' ? <Moon size={18} className="text-text-secondary" /> : <Sun size={18} className="text-text-secondary" />}
            Tema {theme === 'light' ? 'escuro' : 'claro'}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onTrocarPassword();
            }}
            className="flex min-h-touch w-full items-center gap-3 border-t border-border px-4 text-left text-[14px] text-text-primary active:bg-bg-app"
          >
            <KeyRound size={18} className="text-text-secondary" /> Trocar Password
          </button>
          <button
            type="button"
            onClick={() => setSobreAberto((v) => !v)}
            className="flex min-h-touch w-full items-center gap-3 border-t border-border px-4 text-left text-[14px] text-text-primary active:bg-bg-app"
          >
            <Info size={18} className="text-text-secondary" /> Sobre
          </button>
          {sobreAberto ? (
            <div className="border-t border-border bg-bg-app px-4 py-3">
              <p className="text-[13px] font-medium text-text-primary">Kraga Mobile</p>
              <p className="text-[12px] text-text-tertiary">v0.1.0</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void logout()}
            className="flex min-h-touch w-full items-center gap-3 border-t border-border px-4 text-left text-[14px] text-error active:bg-error/10"
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}
