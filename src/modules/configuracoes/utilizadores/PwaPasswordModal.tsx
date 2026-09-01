import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { toast } from '@/components/ui/Toast';
import type { PublicUser } from '@/types';

interface PwaPasswordModalProps {
  open: boolean;
  onClose: () => void;
  target: PublicUser | null;
  pwaEmail: string | null;
  passwordTemporaria: string | null;
}

export function PwaPasswordModal({ open, onClose, target, pwaEmail, passwordTemporaria }: PwaPasswordModalProps): React.JSX.Element {
  async function handleCopy(): Promise<void> {
    if (!passwordTemporaria) return;
    await navigator.clipboard.writeText(passwordTemporaria);
    toast.success('Password copiada.');
  }

  return (
    <HeaderBarModal
      open={open}
      onClose={onClose}
      title={target ? `Acesso PWA ativado — ${target.name}` : 'Acesso PWA ativado'}
      widthClassName="max-w-[420px]"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Terminar
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-text-secondary">
          Esta password temporária só é mostrada uma vez. Envia-a a {target?.name ?? 'este utilizador'} por um canal
          seguro — ele deve alterá-la no primeiro acesso à PWA.
        </p>
        <div className="flex items-center justify-between gap-3 rounded-control border border-border bg-bg-app px-3 py-2">
          <span className="select-all font-mono text-[15px] text-text-primary">{passwordTemporaria}</span>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="shrink-0 rounded-control px-2.5 py-1 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-surface"
          >
            Copiar
          </button>
        </div>
        <p className="text-[12px] text-text-tertiary">Email de acesso: {pwaEmail}</p>
      </div>
    </HeaderBarModal>
  );
}
