import { useState } from 'react';
import { CaretDown, Lock } from '@phosphor-icons/react';
import { AvatarPicker } from '@/components/ui/AvatarPicker';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { Switch } from '@/components/ui/Switch';
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

interface UtilizadoresConfigProps {
  // Vindo do atalho "Ver perfil" do card de avatares na Home — abre já
  // o modal de edição deste utilizador secundário.
  initialEditUserId?: string;
  // Vindo do MensagensBell — abre já a conversa com este utilizador.
  initialConversaUserId?: string;
}

export function UtilizadoresConfig({
  initialEditUserId,
  initialConversaUserId,
}: UtilizadoresConfigProps = {}): React.JSX.Element {
  const { user, updateUser } = useAuth();

  const [nome, setNome] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [savingPerfil, setSavingPerfil] = useState(false);

  const [passwordAberta, setPasswordAberta] = useState(false);
  const [passwordAtual, setPasswordAtual] = useState('');
  const [passwordNova, setPasswordNova] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [avatarSaving, setAvatarSaving] = useState(false);
  const [loginSemPasswordSaving, setLoginSemPasswordSaving] = useState(false);

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

  async function handleAvatarChange(avatar: string | null): Promise<void> {
    setAvatarSaving(true);
    try {
      const updated = await ipcService.users.setAvatar(user!.id, avatar);
      updateUser(updated);
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setAvatarSaving(false);
    }
  }

  async function handleLoginSemPasswordChange(valor: boolean): Promise<void> {
    setLoginSemPasswordSaving(true);
    try {
      const updated = await ipcService.users.setLoginSemPassword(user!.id, valor);
      updateUser(updated);
      toast.success(valor ? 'Login sem password ativado — vais aparecer no ecrã de login.' : 'Login sem password desativado.');
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setLoginSemPasswordSaving(false);
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
      setPasswordAberta(false);
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-xl">
      <div className="mx-auto flex max-w-[640px] flex-col gap-lg">
        <div className="rounded-surface border border-border bg-bg-surface p-lg">
          <div className="mb-lg flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-text-primary">A Minha Conta</h2>
            <span className="rounded-pill bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
              {ROLE_LABEL[user.role]}
            </span>
          </div>

          <div className="mb-lg">
            <AvatarPicker value={user.avatar} onChange={(avatar) => void handleAvatarChange(avatar)} />
            {avatarSaving ? <p className="mt-1 text-[11px] text-text-tertiary">A guardar avatar...</p> : null}
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

          <div className="mt-lg flex items-center justify-between gap-3 rounded-control border border-border bg-bg-app px-3 py-2.5">
            <div>
              <p className="text-[13px] font-medium text-text-primary">Login sem password</p>
              <p className="text-[11px] text-text-tertiary">Aparece no ecrã de login — basta clicar no teu nome para entrar.</p>
            </div>
            <Switch checked={user.loginSemPassword} disabled={loginSemPasswordSaving} onChange={(v) => void handleLoginSemPasswordChange(v)} />
          </div>

          <div className="mt-3 overflow-hidden rounded-control border border-border">
            <button
              type="button"
              onClick={() => setPasswordAberta((v) => !v)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-bg-app"
            >
              <Lock size={15} className="text-text-tertiary" />
              <span className="flex-1 text-[13px] font-medium text-text-primary">Alterar Password</span>
              <CaretDown size={14} className={`text-text-tertiary transition-transform ${passwordAberta ? 'rotate-180' : ''}`} />
            </button>
            {passwordAberta ? (
              <div className="flex flex-col gap-md border-t border-border bg-bg-app px-3 py-3">
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
                <button
                  type="button"
                  disabled={savingPassword || !passwordAtual || !passwordNova}
                  onClick={() => void handleAlterarPassword()}
                  className="self-start rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  {savingPassword ? 'A alterar...' : 'Alterar Password'}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {user.role === 'admin' ? (
          <div className="rounded-surface border border-border bg-bg-surface p-lg">
            <GestaoUtilizadores initialEditUserId={initialEditUserId} initialConversaUserId={initialConversaUserId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
