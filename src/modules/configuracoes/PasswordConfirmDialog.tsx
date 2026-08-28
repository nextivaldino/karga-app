import { useEffect, useState } from 'react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { cleanIpcError } from '@/lib/cleanIpcError';

interface PasswordConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  requireWord?: string;
  countdownSeconds?: number;
  onConfirm: (password: string) => Promise<void>;
  onCancel: () => void;
}

export function PasswordConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  requireWord,
  countdownSeconds,
  onConfirm,
  onCancel,
}: PasswordConfirmDialogProps): React.JSX.Element {
  const [password, setPassword] = useState('');
  const [typedWord, setTypedWord] = useState('');
  const [countdown, setCountdown] = useState(countdownSeconds ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPassword('');
    setTypedWord('');
    setError(null);
    setCountdown(countdownSeconds ?? 0);
    if (!countdownSeconds) return;
    const interval = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const wordOk = !requireWord || typedWord === requireWord;
  const podeConfirmar = password.length > 0 && wordOk && countdown <= 0 && !submitting;

  async function handleConfirm(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(password);
    } catch (err) {
      setError(cleanIpcError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <HeaderBarModal
      open={open}
      onClose={onCancel}
      title={title}
      widthClassName="max-w-[440px]"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-control px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!podeConfirmar}
            onClick={() => void handleConfirm()}
            className="rounded-control bg-error px-4 py-2 text-[13px] font-medium text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'A processar...' : countdown > 0 ? `${confirmLabel} (${countdown}s)` : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[14px] text-text-primary">{message}</p>
        <FloatingLabelInput
          label="A tua password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {requireWord ? (
          <FloatingLabelInput
            label={`Escreve "${requireWord}" para confirmar`}
            value={typedWord}
            onChange={(e) => setTypedWord(e.target.value)}
          />
        ) : null}
        {error ? <p className="text-[13px] text-error">{error}</p> : null}
      </div>
    </HeaderBarModal>
  );
}
