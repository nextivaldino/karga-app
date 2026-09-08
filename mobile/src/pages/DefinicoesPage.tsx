import type { ReactNode } from 'react';
import { CaretRight as ChevronRight, Info, Key as KeyRound, SignOut as LogOut, Moon, Boat as Ship, Sun } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useTopBarSlot } from '@/hooks/useTopBarSlot';
import { Switch } from '@/components/ui/Switch';

function Grupo({ titulo, children }: { titulo?: string; children: ReactNode }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      {titulo ? <p className="px-4 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">{titulo}</p> : null}
      <div className="card-surface overflow-hidden">{children}</div>
    </div>
  );
}

function Linha({
  icon: Icon,
  iconClassName,
  label,
  onClick,
  right,
  destrutiva,
  ultima,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClassName?: string;
  label: string;
  onClick?: () => void;
  right?: ReactNode;
  destrutiva?: boolean;
  ultima?: boolean;
}): React.JSX.Element {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex min-h-touch w-full items-center gap-3 px-4 text-left ${!ultima ? 'border-b border-border' : ''} ${
        onClick ? (destrutiva ? 'active:bg-error/10' : 'active:bg-bg-app') : ''
      }`}
    >
      <Icon size={18} className={iconClassName ?? 'text-text-secondary'} />
      <span className={`flex-1 text-[14px] ${destrutiva ? 'text-error' : 'text-text-primary'}`}>{label}</span>
      {right ?? (onClick ? <ChevronRight size={15} className="text-text-tertiary" /> : null)}
    </Comp>
  );
}

// Painel próprio (em vez do antigo menu-popover) para as definições do
// sistema — estilo "Definições" do iOS: grupos de linhas dentro de
// cartões arredondados, em vez de um dropdown pequeno.
export function DefinicoesPage({ onTrocarPassword }: { onTrocarPassword: () => void }): React.JSX.Element {
  const { theme, setTheme } = useTheme();
  const { logout, pwaUser } = useAuth();

  useTopBarSlot(<span className="text-[16px] font-semibold text-text-primary">Definições</span>);

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Ship size={26} weight="duotone" />
        </span>
        <div>
          <p className="text-[15px] font-bold tracking-wide text-text-primary">KARGA</p>
          <p className="text-[12px] text-text-secondary">{pwaUser?.nome ?? ''}</p>
        </div>
      </div>

      <Grupo titulo="Aparência">
        <Linha
          icon={theme === 'light' ? Sun : Moon}
          label={`Tema ${theme === 'light' ? 'claro' : 'escuro'}`}
          right={<Switch checked={theme === 'dark'} onChange={(v) => setTheme(v ? 'dark' : 'light')} />}
          ultima
        />
      </Grupo>

      <Grupo titulo="Conta">
        <Linha icon={KeyRound} label="Trocar Password" onClick={onTrocarPassword} />
        <Linha icon={LogOut} iconClassName="text-error" label="Sair" onClick={() => void logout()} destrutiva ultima />
      </Grupo>

      <Grupo titulo="Sobre">
        <Linha
          icon={Info}
          label="Sobre o Karga"
          right={<span className="text-[12px] text-text-tertiary">v0.1.0</span>}
          ultima
        />
      </Grupo>

      <div className="px-2 text-center">
        <p className="text-[11px] text-text-tertiary">
          Desenvolvido pela <span className="font-semibold text-text-secondary">NEXT-LABS</span>
        </p>
        <p className="text-[11px] text-text-tertiary">Ivaldino Fortes · 2026</p>
      </div>
    </div>
  );
}
