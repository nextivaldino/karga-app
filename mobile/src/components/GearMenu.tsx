import { Gear as Settings } from '@phosphor-icons/react';
import { useNavigation } from '@/hooks/useNavigation';

// Deixou de ser um dropdown — abre agora o painel de Definições próprio
// (estilo iOS), que junta tema, password e sobre num só sítio em vez de
// um menu pequeno a competir por espaço/z-index com o resto do topo.
export function GearMenu(): React.JSX.Element {
  const { navigate } = useNavigation();

  return (
    <button
      type="button"
      onClick={() => navigate('definicoes')}
      title="Definições"
      className="flex h-10 w-10 items-center justify-center rounded-control text-text-secondary active:bg-bg-app"
    >
      <Settings size={22} />
    </button>
  );
}
