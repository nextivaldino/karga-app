import { useState } from 'react';
import { Package } from '@phosphor-icons/react';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { useAuth } from '@/hooks/useAuth';

export function LoginPage(): React.JSX.Element {
  const { login, deactivatedMessage, clearDeactivatedMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    clearDeactivatedMessage();
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-surface bg-primary/10 text-primary">
          <Package size={32} />
        </div>
        <h1 className="text-[20px] font-semibold text-text-primary">Kraga Mobile</h1>
        <p className="text-[14px] text-text-tertiary">Inicie sessão para continuar</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex w-full max-w-sm flex-col gap-3">
        <FloatingLabelInput
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <FloatingLabelInput
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {deactivatedMessage ? <p className="text-[14px] text-error">{deactivatedMessage}</p> : null}
        {error ? <p className="text-[14px] text-error">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 min-h-touch rounded-control bg-primary text-[16px] font-medium text-white transition-colors active:bg-primary-hover disabled:opacity-60"
        >
          {submitting ? 'A entrar...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
