import { useEffect, useState } from 'react';
import { EnvelopeSimple, IdentificationCard, MapPin, Phone, User } from '@phosphor-icons/react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import type { Contacto } from '@/types';

interface ContactoFormModalProps {
  open: boolean;
  onClose: () => void;
  editingContacto?: Contacto | null;
  onSaved: (contacto: Contacto) => void;
}

export function ContactoFormModal({
  open,
  onClose,
  editingContacto = null,
  onSaved,
}: ContactoFormModalProps): React.JSX.Element {
  const isEditMode = editingContacto != null;

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [morada, setMorada] = useState('');
  const [nif, setNif] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNome(editingContacto?.nome ?? '');
    setTelefone(editingContacto?.telefone ?? '');
    setEmail(editingContacto?.email ?? '');
    setMorada(editingContacto?.morada ?? '');
    setNif(editingContacto?.nif ?? '');
    setNotas(editingContacto?.notas ?? '');
    setError(null);
  }, [open, editingContacto]);

  async function handleSave(): Promise<void> {
    setError(null);
    if (!nome.trim()) {
      setError('Nome é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      const dados = {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        email: email.trim() || null,
        morada: morada.trim() || null,
        nif: nif.trim() || null,
        notas: notas.trim() || null,
      };

      const contacto = isEditMode
        ? await ipcService.contactos.update(editingContacto!.id, dados)
        : await ipcService.contactos.create(dados);
      if (!contacto) throw new Error('Contacto não encontrado.');

      toast.success(isEditMode ? 'Contacto atualizado.' : 'Contacto criado.');
      onSaved(contacto);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? cleanIpcError(err) : 'Erro ao guardar contacto.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <HeaderBarModal
      open={open}
      onClose={onClose}
      title={isEditMode ? 'Editar Contacto' : 'Novo Contacto'}
      widthClassName="max-w-[420px]"
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
      <div className="flex flex-col gap-3">
        <FloatingLabelInput label="Nome" icon={<User size={16} />} value={nome} onChange={(e) => setNome(e.target.value)} required />
        <FloatingLabelInput label="Telefone" icon={<Phone size={16} />} value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        <FloatingLabelInput label="Email" icon={<EnvelopeSimple size={16} />} value={email} onChange={(e) => setEmail(e.target.value)} />
        <FloatingLabelInput label="Morada" icon={<MapPin size={16} />} value={morada} onChange={(e) => setMorada(e.target.value)} />
        <FloatingLabelInput label="NIF" icon={<IdentificationCard size={16} />} value={nif} onChange={(e) => setNif(e.target.value)} />
        <FloatingLabelInput label="Notas" as="textarea" value={notas} onChange={(e) => setNotas(e.target.value)} />
        {error ? <p className="text-[13px] text-error">{error}</p> : null}
      </div>
    </HeaderBarModal>
  );
}
