import { useState } from 'react';
import { Ship } from 'lucide-react';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { useAuth } from './AuthContext';

export function LoginScreen(): React.JSX.Element {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar sessão.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-bg-app px-6" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[380px] rounded-surface border border-border bg-bg-surface p-xl shadow-sm"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="mb-lg flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-surface bg-primary-light text-primary">
            <Ship size={24} />
          </div>
          <h1 className="text-[20px] font-semibold text-text-primary">Kraga Desktop</h1>
          <p className="text-[13px] text-text-secondary">Inicie sessão para continuar.</p>
        </div>

        <div className="flex flex-col gap-3">
          <FloatingLabelInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <FloatingLabelInput
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error ? <p className="mt-3 text-[13px] text-error">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-lg w-full rounded-control bg-primary py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {submitting ? 'A entrar...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
