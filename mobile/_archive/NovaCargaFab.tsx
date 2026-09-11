import { Plus } from '@phosphor-icons/react';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';

// Botão circular flutuante para Nova Carga — estilo "compose" do Notas/
// Lembretes (canto inferior direito). A navegação principal passou para
// as abas no topo do Header (sem barra fixa no fundo), por isso este
// botão fica encostado à safe-area, não a compensar altura de dock/tab
// bar nenhuma. Escondido quando o formulário já está aberto ou
// minimizado, para não sobrepor a pílula.
export function NovaCargaFab(): React.JSX.Element | null {
  const { estado, abrir } = useNovaCargaOverlay();
  if (estado !== 'fechado') return null;

  return (
    <button
      type="button"
      onClick={() => abrir()}
      title="Nova Carga"
      className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-medium transition-transform active:scale-95"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
    >
      <Plus size={26} weight="bold" />
    </button>
  );
}
