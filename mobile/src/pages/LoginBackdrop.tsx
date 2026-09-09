import { Boat as Ship, Package, CurrencyEur as Euro, Bell, List } from '@phosphor-icons/react';

// Fundo puramente decorativo do ecrã de login — silhueta estática da Home,
// nunca dados reais nem chamadas à rede (não há sessão antes do login).
// `aria-hidden` porque é cenário, não conteúdo.
export function LoginBackdrop(): React.JSX.Element {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden bg-bg-app">
      <div className="flex items-center gap-2 border-b border-border/60 bg-bg-header px-4 py-3">
        <span className="text-[16px] font-bold tracking-tight text-text-primary">KARGA</span>
        <span className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-bg-surface">
          <Bell size={15} className="text-text-tertiary" />
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-surface">
          <List size={15} className="text-text-tertiary" />
        </span>
      </div>

      <div className="px-4 py-4">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Ship size={17} weight="duotone" />
          </span>
          <p className="text-[14px] font-medium text-text-primary">Olá</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col items-start gap-1 rounded-surface bg-warning/10 p-3">
            <Package size={18} weight="duotone" className="text-warning" />
            <span className="text-[17px] font-bold text-text-primary">12</span>
            <span className="text-[11px] text-text-secondary">cargas/semana</span>
          </div>
          <div className="flex flex-col items-start gap-1 rounded-surface bg-primary/10 p-3">
            <Euro size={18} weight="duotone" className="text-primary" />
            <span className="text-[17px] font-bold text-text-primary">840 €</span>
            <span className="text-[11px] text-text-secondary">este mês</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-surface bg-bg-surface p-3">
              <span className="h-8 w-8 shrink-0 rounded-full bg-border" />
              <span className="h-2 flex-1 rounded-full bg-border" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
