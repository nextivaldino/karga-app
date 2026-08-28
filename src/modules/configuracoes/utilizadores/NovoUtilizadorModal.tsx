import { useState } from 'react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import { PermissoesForm } from './PermissoesForm';
import type { PermissaoInput } from '@/types';

interface NovoUtilizadorModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function NovoUtilizadorModal({ open, onClose, onSaved }: NovoUtilizadorModalProps): React.JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [permissoes, setPermissoes] = useState<PermissaoInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    setError(null);
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Nome e email obrigatórios, password com pelo menos 6 caracteres.');
      return;
    }

    setSaving(true);
    try {
      await ipcService.users.create({ name: name.trim(), email: email.trim(), password, role: 'user', permissoes });
      toast.success('Utilizador criado.');
      setName('');
      setEmail('');
      setPassword('');
      setPermissoes([]);
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
      title="Novo Utilizador"
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
            {saving ? 'A criar...' : 'Criar Utilizador'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-lg">
        <div className="flex flex-col gap-3">
          <FloatingLabelInput label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <FloatingLabelInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <FloatingLabelInput label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <p className="text-[13px] text-error">{error}</p> : null}
        </div>

        <div>
          <h3 className="mb-sm text-[13px] font-semibold text-text-primary">Permissões</h3>
          <PermissoesForm permissoes={permissoes} onChange={setPermissoes} />
        </div>
      </div>
    </HeaderBarModal>
  );
}
