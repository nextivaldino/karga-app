import { Boat, Gear, House, Package, Stack, Wallet, ArrowsClockwise, DeviceMobile, type Icon } from '@phosphor-icons/react';

// Cor + pictograma de identidade por módulo — ver docs/08-DESIGN-SYSTEM.md
// secção de ícones. Usado nos 5 locais de destaque (abas, cards da Home,
// cards de contentor na vista Ícones, Boxed List de Configurações, ícone
// principal no ecrã de Login) sempre em peso "duotone".
export const MODULE_ICON: Record<ModuleIconName, { icon: Icon; color: string }> = {
  kraga: { icon: Boat, color: '#ffb400' },
  home: { icon: House, color: '#3584e4' },
  cargas: { icon: Package, color: '#ffb400' },
  contentores: { icon: Stack, color: '#2ec27e' },
  configuracoes: { icon: Gear, color: '#9141ac' },
  faturacao: { icon: Wallet, color: '#2190a4' },
  sincronizacao: { icon: ArrowsClockwise, color: '#ffb400' },
  dispositivos: { icon: DeviceMobile, color: '#d56199' },
};

export type ModuleIconName =
  | 'kraga'
  | 'home'
  | 'cargas'
  | 'contentores'
  | 'configuracoes'
  | 'faturacao'
  | 'sincronizacao'
  | 'dispositivos';

interface ModuleIconProps {
  module: ModuleIconName;
  size?: number;
  className?: string;
  // Só para quando o ícone tem de largar a sua cor de identidade por um
  // instante — ex: aba "Sync" ativa sobre a barra amarela, onde a cor
  // laranja do módulo perde contraste (laranja sobre amarelo).
  colorOverride?: string;
}

export function ModuleIcon({ module, size = 24, className, colorOverride }: ModuleIconProps): React.JSX.Element {
  const { icon: Icon, color } = MODULE_ICON[module];
  return <Icon size={size} weight="duotone" color={colorOverride ?? color} className={className} />;
}
