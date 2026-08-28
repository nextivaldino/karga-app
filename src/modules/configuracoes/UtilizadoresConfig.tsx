import { useState } from 'react';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import { useAuth } from '@/modules/auth/AuthContext';
import { GestaoUtilizadores } from './utilizadores/GestaoUtilizadores';
import type { UserRole } from '@/types';

const ROLE_LABEL: Record<UserRole, string> = {
  root: 'Root',
  admin: 'Admin',
  user: 'Utilizador',
};

export function UtilizadoresConfig(): React.JSX.Element {
  const { user, updateUser } = useAuth();

  const [nome, setNome] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [savingPerfil, setSavingPerfil] = useState(false);

  const [passwordAtual, setPasswordAtual] = useState('');
  const [passwordNova, setPasswordNova] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user) {
    return <div className="p-xl text-[13px] text-text-tertiary">A carregar...</div>;
  }

  async function handleGuardarPerfil(): Promise<void> {
    setSavingPerfil(true);
    try {
      const updated = await ipcService.auth.updateProfile(user!.id, { name: nome.trim(), email: email.trim() });
      updateUser(updated);
      toast.success('Perfil atualizado.');
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setSavingPerfil(false);
    }
  }

  async function handleAlterarPassword(): Promise<void> {
    if (passwordNova !== passwordConfirmar) {
      toast.error('As passwords novas não coincidem.');
      return;
    }
    setSavingPassword(true);
    try {
      await ipcService.auth.changePassword(user!.id, passwordAtual, passwordNova);
      toast.success('Password alterada.');
      setPasswordAtual('');
      setPasswordNova('');
      setPasswordConfirmar('');
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-xl">
      <div className="mx-auto flex max-w-[560px] flex-col gap-lg">

        <div>
          <div className="mb-md flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-text-primary">O Meu Perfil</h2>
            <span className="rounded-pill bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
              {ROLE_LABEL[user.role]}
            </span>
          </div>
          <div className="flex flex-col gap-md">
            <FloatingLabelInput label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            <FloatingLabelInput label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button
            type="button"
            disabled={savingPerfil}
            onClick={() => void handleGuardarPerfil()}
            className="mt-md rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {savingPerfil ? 'A guardar...' : 'Guardar Perfil'}
          </button>
        </div>

        <div>
          <h2 className="mb-md text-[15px] font-semibold text-text-primary">Alterar Password</h2>
          <div className="flex flex-col gap-md">
            <FloatingLabelInput
              label="Password Atual"
              type="password"
              value={passwordAtual}
              onChange={(e) => setPasswordAtual(e.target.value)}
            />
            <FloatingLabelInput
              label="Nova Password"
              type="password"
              value={passwordNova}
              onChange={(e) => setPasswordNova(e.target.value)}
            />
            <FloatingLabelInput
              label="Confirmar Nova Password"
              type="password"
              value={passwordConfirmar}
              onChange={(e) => setPasswordConfirmar(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={savingPassword || !passwordAtual || !passwordNova}
            onClick={() => void handleAlterarPassword()}
            className="mt-md rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {savingPassword ? 'A alterar...' : 'Alterar Password'}
          </button>
        </div>

        {user.role === 'admin' ? <GestaoUtilizadores /> : null}
      </div>
    </div>
  );
}
