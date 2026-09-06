import { useEffect, useState } from 'react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { AvatarPicker } from '@/components/ui/AvatarPicker';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import { PermissoesForm } from './PermissoesForm';
import type { Contentor, PermissaoInput, UsuarioComSessao } from '@/types';

interface EditarUtilizadorModalProps {
  open: boolean;
  onClose: () => void;
  utilizador: UsuarioComSessao | null;
  onSaved: () => void;
}

export function EditarUtilizadorModal({
  open,
  onClose,
  utilizador,
  onSaved,
}: EditarUtilizadorModalProps): React.JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loginSemPassword, setLoginSemPassword] = useState(false);
  const [contentorPadraoId, setContentorPadraoId] = useState<string | null>(null);
  const [contentoresAbertos, setContentoresAbertos] = useState<Contentor[]>([]);
  const [permissoes, setPermissoes] = useState<PermissaoInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !utilizador) return;
    setName(utilizador.name);
    setEmail(utilizador.email);
    setAvatar(utilizador.avatar);
    setLoginSemPassword(utilizador.loginSemPassword);
    setContentorPadraoId(utilizador.contentorPadraoId);
    setError(null);
    if (utilizador.pwaHabilitado) {
      void ipcService.contentores.list({ estado: 'aberto' }).then(setContentoresAbertos);
    }
    void ipcService.permissoes.listPorUser(utilizador.id).then((rows) => {
      setPermissoes(
        rows.map((r) => ({
          modulo: r.modulo,
          podeVer: r.podeVer,
          podeCriar: r.podeCriar,
          podeEditar: r.podeEditar,
          podeEliminar: r.podeEliminar,
        })),
      );
    });
  }, [open, utilizador]);

  async function handleAvatarChange(novo: string | null): Promise<void> {
    if (!utilizador) return;
    setAvatar(novo);
    try {
      await ipcService.users.setAvatar(utilizador.id, novo);
      onSaved();
    } catch (err) {
      toast.error(cleanIpcError(err));
    }
  }

  async function handleLoginSemPasswordChange(valor: boolean): Promise<void> {
    if (!utilizador) return;
    setLoginSemPassword(valor);
    try {
      await ipcService.users.setLoginSemPassword(utilizador.id, valor);
      onSaved();
    } catch (err) {
      toast.error(cleanIpcError(err));
    }
  }

  async function handleContentorPadraoChange(valor: string): Promise<void> {
    if (!utilizador) return;
    const novoId = valor || null;
    setContentorPadraoId(novoId);
    try {
      await ipcService.users.setContentorPadrao(utilizador.id, novoId);
      onSaved();
    } catch (err) {
      toast.error(cleanIpcError(err));
    }
  }

  async function handleSave(): Promise<void> {
    if (!utilizador) return;
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError('Nome e email são obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      await ipcService.users.update(utilizador.id, { name: name.trim(), email: email.trim() });
      await ipcService.permissoes.set(utilizador.id, permissoes);
      toast.success('Utilizador atualizado.');
      onSaved();
      onClose();
    } catch (err) {
      setError(cleanIpcError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <HeaderBarModal
      open={open}
      onClose={onClose}
      title={utilizador ? `Editar — ${utilizador.name}` : 'Editar Utilizador'}
      widthClassName="max-w-[560px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-control px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? 'A guardar...' : 'Guardar'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-lg">
        <AvatarPicker value={avatar} onChange={(v) => void handleAvatarChange(v)} />

        <div className="flex flex-col gap-3">
          <FloatingLabelInput label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <FloatingLabelInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error ? <p className="text-[13px] text-error">{error}</p> : null}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-control border border-border bg-bg-app px-3 py-2.5">
          <div>
            <p className="text-[13px] font-medium text-text-primary">Login sem password</p>
            <p className="text-[11px] text-text-tertiary">Aparece no ecrã de login — basta clicar no nome para entrar.</p>
          </div>
          <Switch checked={loginSemPassword} onChange={(v) => void handleLoginSemPasswordChange(v)} />
        </div>

        {utilizador?.pwaHabilitado ? (
          <FloatingLabelInput
            as="select"
            label="Contentor padrão (PWA)"
            value={contentorPadraoId ?? ''}
            onChange={(e) => void handleContentorPadraoChange(e.target.value)}
          >
            <option value="">Usar padrão do sistema</option>
            {contentoresAbertos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nome}
              </option>
            ))}
          </FloatingLabelInput>
        ) : null}

        <div>
          <h3 className="mb-sm text-[13px] font-semibold text-text-primary">Permissões</h3>
          <PermissoesForm permissoes={permissoes} onChange={setPermissoes} />
        </div>
      </div>
    </HeaderBarModal>
  );
}
