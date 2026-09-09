import { useState } from 'react';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { useAuth } from '@/hooks/useAuth';
import { LoginBackdrop } from './LoginBackdrop';

export function LoginPage(): React.JSX.Element {
  const { login, deactivatedMessage, clearDeactivatedMessage } = useAuth();
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    clearDeactivatedMessage();
    setSubmitting(true);
    try {
      await login(identificador.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden p-6">
      {/* Fundo: silhueta desfocada e amortecida da Home, só decorativa —
          os campos já não vivem dentro de um cartão, ficam diretamente
          sobre este fundo. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 scale-105 opacity-[0.6] blur-md">
          <LoginBackdrop />
        </div>
        <div className="absolute inset-0 bg-bg-app/35" />
      </div>

      <div className="relative flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/karga-logo.svg" alt="" className="h-16 w-16" />
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-text-primary drop-shadow-sm">Kraga Mobile</h1>
            <p className="mt-1 text-[14px] text-text-tertiary drop-shadow-sm">Inicie sessão para continuar</p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <FloatingLabelInput
            label="Email ou nome"
            autoComplete="username"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
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
