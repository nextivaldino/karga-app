import { useEffect, useState } from 'react';
import { EnvelopeSimple, Lock } from '@phosphor-icons/react';
import { ModuleIcon } from '@/components/icons/ModuleIcon';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { toast } from '@/components/ui/Toast';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import { useAuth } from './AuthContext';
import type { QuickLoginUser } from '@/types';

export function LoginScreen(): React.JSX.Element {
  const { login, updateUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [quickLogin, setQuickLogin] = useState<QuickLoginUser[] | null>(null);
  const [usarPassword, setUsarPassword] = useState(false);
  const [entrandoComoId, setEntrandoComoId] = useState<string | null>(null);

  useEffect(() => {
    void ipcService.auth.listQuickLogin().then(setQuickLogin).catch(() => setQuickLogin([]));
  }, []);

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

  async function handleQuickLogin(userId: string): Promise<void> {
    setEntrandoComoId(userId);
    try {
      const user = await ipcService.auth.loginSemPassword(userId);
      updateUser(user);
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setEntrandoComoId(null);
    }
  }

  const mostrarGrelha = quickLogin != null && quickLogin.length > 0 && !usarPassword;

  return (
    <div className="flex h-full items-center justify-center bg-bg-app px-6" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="w-full max-w-[380px]" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="mb-lg flex flex-col items-center gap-2 text-center">
          <ModuleIcon module="kraga" size={56} />
          <h1 className="text-[20px] font-semibold text-text-primary">Kraga Desktop</h1>
          <p className="text-[13px] text-text-secondary">
            {mostrarGrelha ? 'Quem é?' : 'Inicie sessão para continuar.'}
          </p>
        </div>

        {mostrarGrelha ? (
          <div className="rounded-surface border border-border bg-bg-surface p-xl">
            <div className="grid grid-cols-3 gap-3">
              {quickLogin!.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  disabled={entrandoComoId != null}
                  onClick={() => void handleQuickLogin(u.id)}
                  className="flex flex-col items-center gap-1.5 rounded-control p-2 text-center transition-colors hover:bg-bg-app disabled:opacity-50"
                >
                  <UserAvatar avatar={u.avatar} size={56} />
                  <span className="line-clamp-1 text-[12px] font-medium text-text-primary">
                    {entrandoComoId === u.id ? 'A entrar...' : u.name}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setUsarPassword(true)}
              className="mt-lg w-full text-center text-[12px] font-medium text-primary"
            >
              Entrar com email e password
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-surface border border-border bg-bg-surface p-xl">
            <div className="flex flex-col gap-3">
              <FloatingLabelInput
                label="Email"
                type="email"
                icon={<EnvelopeSimple size={16} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <FloatingLabelInput
                label="Password"
                type="password"
                icon={<Lock size={16} />}
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

            {quickLogin != null && quickLogin.length > 0 ? (
              <button
                type="button"
                onClick={() => setUsarPassword(false)}
                className="mt-md w-full text-center text-[12px] font-medium text-text-secondary"
              >
                ‹ Voltar
              </button>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
