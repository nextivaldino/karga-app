import { useEffect, useState } from 'react';
import { EnvelopeSimple, Lock } from '@phosphor-icons/react';
import { ModuleIcon } from '@/components/icons/ModuleIcon';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
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

  const [esqueciOpen, setEsqueciOpen] = useState(false);
  const [esqueciEmail, setEsqueciEmail] = useState('');
  const [esqueciSubmitting, setEsqueciSubmitting] = useState(false);

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

  async function handleSolicitarReset(): Promise<void> {
    if (!esqueciEmail.trim()) return;
    setEsqueciSubmitting(true);
    try {
      await ipcService.auth.solicitarResetPasswordAdmin(esqueciEmail.trim());
    } catch {
      // Silencioso mesmo em erro — o backend nunca revela se o email
      // existe, a UI não deve dar pistas diferentes consoante o caso.
    } finally {
      setEsqueciSubmitting(false);
      setEsqueciOpen(false);
      setEsqueciEmail('');
      toast.success('Se esse email pertencer a um Admin, o Root vai ver o pedido de reset.');
    }
  }

  const mostrarGrelha = quickLogin != null && quickLogin.length > 0 && !usarPassword;

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden px-6" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      {/* Cenário ao estilo "ecrã de bloqueio" — a mesma identidade de cor
          da app como pano de fundo suave (só gradientes, sem filtros de
          blur no ecrã inteiro — pesado a mais para o compositor), com o
          vidro fosco concentrado só no cartão de login, ao estilo Aero
          Glass do Windows 7. */}
      <div
        className="pointer-events-none absolute inset-0 bg-bg-app"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--color-primary) 32%, transparent) 0%, transparent 45%),' +
            'radial-gradient(circle at 85% 10%, color-mix(in srgb, var(--color-purple) 26%, transparent) 0%, transparent 42%),' +
            'radial-gradient(circle at 15% 90%, color-mix(in srgb, var(--color-success) 26%, transparent) 0%, transparent 48%),' +
            'radial-gradient(circle at 90% 85%, color-mix(in srgb, var(--color-warning) 24%, transparent) 0%, transparent 45%)',
        }}
      >
        <ModuleIcon module="kraga" size={560} className="absolute -bottom-24 -right-24 opacity-[0.05]" />
      </div>

      <div className="relative w-full max-w-[380px]" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="mb-lg flex flex-col items-center gap-2 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/20 shadow-lg backdrop-blur-md">
            <ModuleIcon module="kraga" size={34} />
          </span>
          <div>
            <h1 className="text-[26px] font-bold tracking-wide text-text-primary drop-shadow-sm">KARGA</h1>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              Sistema de Gestão de Cargas e Logística
            </p>
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">
            {mostrarGrelha ? 'Quem é?' : 'Inicie sessão para continuar.'}
          </p>
        </div>

        {mostrarGrelha ? (
          <div className="rounded-[22px] border border-white/40 bg-white/25 p-xl shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/25">
            <div className="grid grid-cols-3 gap-3">
              {quickLogin!.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  disabled={entrandoComoId != null}
                  onClick={() => void handleQuickLogin(u.id)}
                  className="flex flex-col items-center gap-1.5 rounded-control p-2 text-center transition-colors hover:bg-white/30 disabled:opacity-50 dark:hover:bg-white/10"
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
          <form
            onSubmit={handleSubmit}
            className="rounded-[22px] border border-white/40 bg-white/25 p-xl shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/25"
          >
            <div className="flex flex-col gap-3">
              <FloatingLabelInput
                label="Email ou nome"
                type="text"
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
              className="mt-lg w-full rounded-control bg-primary py-2.5 text-[14px] font-medium text-white shadow-md transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting ? 'A entrar...' : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={() => {
                setEsqueciEmail(email);
                setEsqueciOpen(true);
              }}
              className="mt-md w-full text-center text-[12px] font-medium text-text-secondary"
            >
              Esqueci-me da password
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

      <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-[10px] text-text-tertiary">
        <span className="opacity-70">desenvolvido pela </span>
        <span className="font-semibold tracking-wide text-text-secondary">NEXT-LABS</span>
      </p>

      <HeaderBarModal
        open={esqueciOpen}
        onClose={() => setEsqueciOpen(false)}
        title="Esqueci-me da password"
        widthClassName="max-w-[400px]"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEsqueciOpen(false)}
              className="rounded-control px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={esqueciSubmitting || !esqueciEmail.trim()}
              onClick={() => void handleSolicitarReset()}
              className="rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {esqueciSubmitting ? 'A enviar...' : 'Enviar pedido'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-text-secondary">
            Só para contas Admin. Escreve o teu email — o Root vai ver o pedido na próxima vez que iniciar sessão e
            pode definir-te uma password nova.
          </p>
          <FloatingLabelInput
            label="Email"
            type="email"
            icon={<EnvelopeSimple size={16} />}
            value={esqueciEmail}
            onChange={(e) => setEsqueciEmail(e.target.value)}
          />
        </div>
      </HeaderBarModal>
    </div>
  );
}
