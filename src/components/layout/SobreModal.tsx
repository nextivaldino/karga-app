import { ModuleIcon } from '@/components/icons/ModuleIcon';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';

interface SobreModalProps {
  open: boolean;
  onClose: () => void;
}

export function SobreModal({ open, onClose }: SobreModalProps): React.JSX.Element {
  return (
    <HeaderBarModal open={open} onClose={onClose} title="Sobre o Karga" widthClassName="max-w-[360px]">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-app">
          <ModuleIcon module="kraga" size={34} />
        </span>
        <div>
          <p className="text-[18px] font-bold tracking-wide text-text-primary">KARGA</p>
          <p className="text-[12px] text-text-secondary">Sistema de Gestão de Cargas e Logística</p>
        </div>
        <div className="mt-2 text-[12px] text-text-tertiary">
          <p>
            Desenvolvido pela <span className="font-semibold text-text-secondary">NEXT-LABS</span>
          </p>
          <p>Ivaldino Fortes · 2026</p>
        </div>
      </div>
    </HeaderBarModal>
  );
}
