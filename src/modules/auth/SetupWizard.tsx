import { useState } from 'react';
import { EnvelopeSimple, Lock, User } from '@phosphor-icons/react';
import { ModuleIcon } from '@/components/icons/ModuleIcon';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { useAuth } from './AuthContext';

export function SetupWizard(): React.JSX.Element {
  const { completeSetup } = useAuth();

  const [rootName, setRootName] = useState('');
  const [rootEmail, setRootEmail] = useState('');
  const [rootPassword, setRootPassword] = useState('');

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (adminPassword !== adminConfirmPassword) {
      setError('As passwords do Admin não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      await completeSetup({ rootName, rootEmail, rootPassword, adminName, adminEmail, adminPassword });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao concluir o setup.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex h-full items-center justify-center overflow-y-auto bg-bg-app px-6 py-8"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[480px] rounded-surface border border-border bg-bg-surface p-xl shadow-sm"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="mb-lg flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-surface bg-primary-light">
            <ModuleIcon module="kraga" size={24} />
          </div>
          <h1 className="text-[20px] font-semibold text-text-primary">Bem-vindo ao Kraga Desktop</h1>
          <p className="text-[13px] text-text-secondary">
            Cria a conta técnica Root (manutenção do sistema) e a conta Admin (operação diária) para começar.
          </p>
        </div>

        <div className="flex flex-col gap-lg">
          <div>
            <h2 className="mb-sm text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">
              Conta Root (técnica)
            </h2>
            <div className="flex flex-col gap-3">
              <FloatingLabelInput
                label="Nome"
                icon={<User size={16} />}
                value={rootName}
                onChange={(e) => setRootName(e.target.value)}
                required
              />
              <FloatingLabelInput
                label="Email"
                type="email"
                icon={<EnvelopeSimple size={16} />}
                value={rootEmail}
                onChange={(e) => setRootEmail(e.target.value)}
                required
              />
              <FloatingLabelInput
                label="Password"
                type="password"
                icon={<Lock size={16} />}
                value={rootPassword}
                onChange={(e) => setRootPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <h2 className="mb-sm text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">
              Conta Admin (operação)
            </h2>
            <div className="flex flex-col gap-3">
              <FloatingLabelInput
                label="Nome"
                icon={<User size={16} />}
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
              />
              <FloatingLabelInput
                label="Email"
                type="email"
                icon={<EnvelopeSimple size={16} />}
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
              <FloatingLabelInput
                label="Password"
                type="password"
                icon={<Lock size={16} />}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                minLength={6}
              />
              <FloatingLabelInput
                label="Confirmar Password"
                type="password"
                icon={<Lock size={16} />}
                value={adminConfirmPassword}
                onChange={(e) => setAdminConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>
        </div>

        {error ? <p className="mt-3 text-[13px] text-error">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-lg w-full rounded-control bg-primary py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {submitting ? 'A criar...' : 'Criar Contas e Continuar'}
        </button>
      </form>
    </div>
  );
}
