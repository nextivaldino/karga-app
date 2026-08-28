import { useState } from 'react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import type { PublicUser } from '@/types';

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
  target: PublicUser | null;
  onReset: (targetUserId: string, newPassword: string) => Promise<void>;
}

export function ResetPasswordModal({ open, onClose, target, onReset }: ResetPasswordModalProps): React.JSX.Element {
  const [novaPassword, setNovaPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    setError(null);
    if (novaPassword !== confirmar) {
      setError('As passwords não coincidem.');
      return;
    }
    if (!target) return;

    setSubmitting(true);
    try {
      await onReset(target.id, novaPassword);
      toast.success(`Password de ${target.name} atualizada.`);
      setNovaPassword('');
      setConfirmar('');
      onClose();
    } catch (err) {
      setError(cleanIpcError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <HeaderBarModal
      open={open}
      onClose={onClose}
      title={target ? `Resetar Password — ${target.name}` : 'Resetar Password'}
      widthClassName="max-w-[400px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-control px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {submitting ? 'A gravar...' : 'Definir Nova Password'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <FloatingLabelInput
          label="Nova Password"
          type="password"
          value={novaPassword}
          onChange={(e) => setNovaPassword(e.target.value)}
        />
        <FloatingLabelInput
          label="Confirmar Nova Password"
          type="password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
        />
        {error ? <p className="text-[13px] text-error">{error}</p> : null}
      </div>
    </HeaderBarModal>
  );
}
