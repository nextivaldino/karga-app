import { House, Package, Stack, Gear, MagnifyingGlass, ArrowUpRight } from '@phosphor-icons/react';
import { ModuleIcon } from '@/components/icons/ModuleIcon';
import { KargaLogo } from '@/components/icons/KargaLogo';

// Fundo puramente decorativo do ecrã de login — nunca dados reais, nunca
// chamadas IPC (não há sessão antes do login). É uma silhueta estática da
// Home, desfocada e amortecida, só para dar profundidade ao ecrã de login
// ("dá para ver ligeiramente a app por trás"), pedido do utilizador em
// 2026-09-09. `aria-hidden` porque não é conteúdo, é cenário.
const WIDGETS: { label: string; value: string; iconModule: 'cargas' | 'contentores' | 'faturacao' | 'home'; pastelBg: string }[] = [
  { label: 'Cargas (mês)', value: '24', iconModule: 'cargas', pastelBg: 'bg-primary/10' },
  { label: 'Contentores Abertos', value: '3', iconModule: 'contentores', pastelBg: 'bg-success/10' },
  { label: 'Valor Devido', value: '1 240 €', iconModule: 'faturacao', pastelBg: 'bg-warning/10' },
  { label: 'Entregues (mês)', value: '18', iconModule: 'home', pastelBg: 'bg-purple/10' },
];

export function LoginBackdrop(): React.JSX.Element {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden bg-bg-app">
      <div className="flex h-14 items-center gap-6 border-b border-border bg-bg-header px-8">
        <KargaLogo size={22} />
        <div className="flex items-center gap-5 text-[13px] font-medium text-text-secondary">
          <span className="flex items-center gap-1.5 text-primary"><House size={15} weight="fill" /> Home</span>
          <span className="flex items-center gap-1.5"><Package size={15} /> Cargas</span>
          <span className="flex items-center gap-1.5"><Stack size={15} /> Contentores</span>
          <span className="flex items-center gap-1.5"><Gear size={15} /> Configurações</span>
        </div>
      </div>

      <div className="mx-auto max-w-[1040px] px-8 pt-8">
        <div className="mb-6 flex items-center gap-3">
          <KargaLogo size={36} />
          <div>
            <p className="text-[16px] font-semibold text-text-primary">Boa tarde</p>
            <p className="text-[12px] text-text-tertiary">Tudo o que precisas de saber agora, num só sítio.</p>
          </div>
        </div>

        <div className="mb-6 flex h-11 items-center gap-2 rounded-control border border-border bg-bg-surface px-3 text-text-tertiary">
          <MagnifyingGlass size={16} />
          <span className="text-[13px]">Pesquisar em tudo...</span>
        </div>

        <div className="mb-6 grid grid-cols-4 gap-3">
          {WIDGETS.map((w) => (
            <div key={w.label} className={`rounded-surface p-4 ${w.pastelBg}`}>
              <ModuleIcon module={w.iconModule} size={18} className="mb-6" />
              <p className="text-[22px] font-bold text-text-primary">{w.value}</p>
              <p className="text-[11px] text-text-tertiary">{w.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-surface border border-border bg-bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-text-primary">Últimas Cargas Sincronizadas</p>
            <span className="flex items-center gap-1 text-[12px] text-primary">Ver tudo <ArrowUpRight size={12} /></span>
          </div>
          <div className="flex flex-col gap-3">
            {['TF 024 · Betoneira', 'TF 023 · Frigorífico', 'TF 022 · Caixa mista'].map((linha) => (
              <div key={linha} className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <span className="text-[13px] text-text-secondary">{linha}</span>
                <span className="h-2 w-16 rounded-full bg-border" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
