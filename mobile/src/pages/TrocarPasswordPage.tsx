import { useState } from 'react';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { useAuth } from '@/hooks/useAuth';

interface TrocarPasswordPageProps {
  onCancel?: () => void;
  onDone?: () => void;
}

export function TrocarPasswordPage({ onCancel, onDone }: TrocarPasswordPageProps): React.JSX.Element {
  const { changePassword } = useAuth();
  const [novaPassword, setNovaPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (novaPassword.length < 6) {
      setError('A password tem de ter pelo menos 6 caracteres.');
      return;
    }
    if (novaPassword !== confirmar) {
      setError('As passwords não coincidem.');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(novaPassword);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao alterar a password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center gap-8 p-6">
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="absolute left-4 top-4 flex min-h-touch items-center gap-1.5 text-[14px] font-medium text-text-secondary"
        >
          <ArrowLeft size={18} /> Voltar
        </button>
      ) : null}

      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-surface bg-warning/10 text-warning">
          <KeyRound size={32} />
        </div>
        <h1 className="text-[20px] font-semibold text-text-primary">Definir nova password</h1>
        <p className="max-w-xs text-[14px] text-text-tertiary">
          Esta é a sua primeira entrada. Defina uma password nova antes de continuar.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex w-full max-w-sm flex-col gap-3">
        <FloatingLabelInput
          label="Nova password"
          type="password"
          autoComplete="new-password"
          value={novaPassword}
          onChange={(e) => setNovaPassword(e.target.value)}
          required
        />
        <FloatingLabelInput
          label="Confirmar nova password"
          type="password"
          autoComplete="new-password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          required
        />

        {error ? <p className="text-[14px] text-error">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 min-h-touch rounded-control bg-primary text-[16px] font-medium text-white transition-colors active:bg-primary-hover disabled:opacity-60"
        >
          {submitting ? 'A gravar...' : 'Definir password'}
        </button>
      </form>
    </div>
  );
}
