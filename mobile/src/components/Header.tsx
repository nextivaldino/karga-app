import { DynamicIsland } from './DynamicIsland';
import { GearMenu } from './GearMenu';

// Cabeçalho único de toda a app — mesma banda de cor cheia em Início,
// Cargas e Definições: logo, ilha dinâmica (seletor de contentor fundido
// com notificações) e engrenagem. Cor sólida (não translúcida) é a
// linguagem "blocos de cor vivos" pedida — uma banda que mudasse de tom
// por página deixaria de ler como identidade, por isso é sempre a mesma.
export function Header(): React.JSX.Element {
  return (
    <div
      className="relative z-30 grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 bg-primary px-4 pb-2.5 shadow-md"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}
    >
      {/* Crachá branco à volta do logo — o logo é um gradiente
          verde→azul→roxo; sobre a banda azul sólida a parte azul do
          gradiente perdia contraste. O crachá garante legibilidade
          independentemente da cor da banda. */}
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
        <img src="/karga-logo.svg" alt="Karga" className="h-5 w-5" />
      </span>
      <div className="flex justify-center overflow-hidden">
        <DynamicIsland />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <GearMenu className="flex h-10 w-10 items-center justify-center rounded-control text-white active:bg-white/15" />
      </div>
    </div>
  );
}
