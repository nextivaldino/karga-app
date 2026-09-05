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
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-purple/15 blur-3xl" />

      <div className="relative flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-primary text-white shadow-medium">
            <Package size={32} weight="duotone" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-text-primary">Kraga Mobile</h1>
            <p className="mt-1 text-[14px] text-text-tertiary">Inicie sessão para continuar</p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="card-surface flex flex-col gap-3 p-5">
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

          <button type="submit" disabled={submitting} className="btn-primary mt-2 w-full">
            {submitting ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
