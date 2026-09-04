import { useEffect, useState } from 'react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { ipcService } from '@/services/ipcService';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { LISTA_BG, LISTA_INK } from './listaVisual';
import type { Contentor } from '@/types';

interface NovoContentorModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (contentor: Contentor) => void;
  editingContentor?: Contentor | null;
  // Liga o switch "Marcar como Lista" já ao abrir (ignorado em modo
  // edição) — usado pelo atalho "Criar Lista" do card de sincronização.
  listaInicial?: boolean;
}

type CodigoModo = 'automatico' | 'manual';

export function NovoContentorModal({
  open,
  onClose,
  onSaved,
  editingContentor = null,
  listaInicial = false,
}: NovoContentorModalProps): React.JSX.Element | null {
  const isEditMode = editingContentor != null;

  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoModo, setCodigoModo] = useState<CodigoModo>('automatico');
  const [categoria, setCategoria] = useState('');
  const [dataPartida, setDataPartida] = useState('');
  const [dataChegadaPrevista, setDataChegadaPrevista] = useState('');
  const [ehLista, setEhLista] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (editingContentor) {
      setNome(editingContentor.nome);
      setCodigo(editingContentor.codigo);
      setCodigoModo('manual');
      setCategoria(editingContentor.categoria ?? '');
      setDataPartida(editingContentor.dataPartida ?? '');
      setDataChegadaPrevista(editingContentor.dataChegadaPrevista ?? '');
      setEhLista(editingContentor.ehLista);
    } else {
      setNome('');
      setCodigoModo('automatico');
      setCategoria('');
      setDataPartida('');
      setDataChegadaPrevista('');
      setEhLista(listaInicial);
      void ipcService.contentores.nextCodigo().then(setCodigo);
    }
  }, [open, editingContentor, listaInicial]);

  function handleToggleCodigoModo(manual: boolean): void {
    if (manual) {
      setCodigoModo('manual');
      if (!isEditMode) setCodigo('');
    } else {
      setCodigoModo('automatico');
      void ipcService.contentores.nextCodigo().then(setCodigo);
    }
  }

  async function handleSave(): Promise<void> {
    setError(null);
    if (!nome.trim()) {
      setError('Nome é obrigatório.');
      return;
    }
    if (!codigo.trim()) {
      setError('Código é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && editingContentor) {
        const updated = await ipcService.contentores.update(editingContentor.id, {
          nome: nome.trim(),
          codigo: codigo.trim(),
          categoria: categoria.trim() || null,
          dataPartida: dataPartida || null,
          dataChegadaPrevista: dataChegadaPrevista || null,
        });
        toast.success(`Contentor ${codigo.trim()} atualizado.`);
        onSaved(updated ?? editingContentor);
      } else {
        const created = await ipcService.contentores.create({
          nome: nome.trim(),
          codigo: codigo.trim(),
          categoria: categoria.trim() || null,
          dataPartida: dataPartida || null,
          dataChegadaPrevista: dataChegadaPrevista || null,
          ehLista,
        });
        toast.success(`Contentor ${created.codigo} criado.`);
        onSaved(created);
      }
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
      title={
        <div className="flex flex-col items-center leading-tight">
          <span className="text-[15px] font-semibold text-white">{isEditMode ? 'Editar Contentor' : 'Novo Contentor'}</span>
          {isEditMode && editingContentor ? (
            <span className="truncate text-[11px] font-normal text-white/75">
              {editingContentor.codigo} — {editingContentor.nome}
            </span>
          ) : null}
        </div>
      }
      headerClassName="h-14 bg-primary px-4"
      headerStyle={{ color: '#ffffff' }}
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
        <FloatingLabelInput label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />

        <div className="flex items-center gap-3">
          <div className="w-40 shrink-0">
            <FloatingLabelInput label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <span className={codigoModo === 'automatico' ? 'text-text-primary' : 'text-text-tertiary'}>Automático</span>
            <Switch checked={codigoModo === 'manual'} onChange={handleToggleCodigoModo} disabled={isEditMode} />
            <span className={codigoModo === 'manual' ? 'text-text-primary' : 'text-text-tertiary'}>Manual</span>
          </div>
        </div>

        <FloatingLabelInput label="Categoria (opcional)" value={categoria} onChange={(e) => setCategoria(e.target.value)} />

        {!isEditMode ? (
          <div
            className="flex items-center justify-between rounded-control px-3 py-2"
            style={{ backgroundColor: LISTA_BG, color: LISTA_INK }}
          >
            <span className="text-[13px] font-medium">
              Marcar como Lista
              <span className="block text-[11px] font-normal opacity-75">
                Agrupamento leve de cargas — pode ser convertido em contentor mais tarde.
              </span>
            </span>
            <Switch checked={ehLista} onChange={setEhLista} />
          </div>
        ) : null}

        <FloatingLabelInput
          label="Data de Partida"
          type="date"
          value={dataPartida}
          onChange={(e) => setDataPartida(e.target.value)}
        />
        <FloatingLabelInput
          label="Data de Chegada Prevista"
          type="date"
          value={dataChegadaPrevista}
          onChange={(e) => setDataChegadaPrevista(e.target.value)}
        />

        {error ? <p className="text-[13px] text-error">{error}</p> : null}
      </div>
    </HeaderBarModal>
  );
}
