import { useEffect, useState } from 'react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import { PasswordConfirmDialog } from './PasswordConfirmDialog';
import type { CreateContactoInput } from '@/types';

interface ImportarExcelModalProps {
  open: boolean;
  onClose: () => void;
  onImportado: () => void;
}

export function ImportarExcelModal({ open, onClose, onImportado }: ImportarExcelModalProps): React.JSX.Element {
  const [caminho, setCaminho] = useState('');
  const [linhas, setLinhas] = useState<CreateContactoInput[]>([]);
  const [erros, setErros] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setCaminho('');
      setLinhas([]);
      setErros([]);
    }
  }, [open]);

  async function handleEscolherFicheiro(): Promise<void> {
    setLoading(true);
    try {
      const result = await ipcService.settings.previewImportExcel();
      if ('canceled' in result) return;
      setCaminho(result.path);
      setLinhas(result.linhas);
      setErros(result.erros);
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmarImportacao(password: string): Promise<void> {
    const result = await ipcService.settings.confirmarImportExcel(linhas, password);
    toast.success(`${result.criados} contacto(s) importado(s).`);
    setPasswordOpen(false);
    onImportado();
    onClose();
  }

  const temPreview = caminho !== '';

  return (
    <>
      <HeaderBarModal
        open={open}
        onClose={onClose}
        title="Importar Contactos (Excel)"
        widthClassName="max-w-[600px]"
        footer={
          !temPreview ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleEscolherFicheiro()}
              className="rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {loading ? 'A carregar...' : 'Escolher Ficheiro...'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setCaminho('');
                  setLinhas([]);
                  setErros([]);
                }}
                className="rounded-control px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
              >
                Escolher Outro Ficheiro
              </button>
              <button
                type="button"
                disabled={linhas.length === 0}
                onClick={() => setPasswordOpen(true)}
                className="rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmar Importação ({linhas.length})
              </button>
            </>
          )
        }
      >
        {!temPreview ? (
          <p className="text-[13px] text-text-secondary">
            Escolhe um ficheiro .xlsx com cabeçalhos de coluna: <strong>nome</strong> (obrigatória), telefone, email,
            morada, nif.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="truncate text-[12px] text-text-tertiary">{caminho}</p>
            {erros.length > 0 ? (
              <div className="max-h-24 overflow-y-auto rounded-control border border-warning/30 bg-warning/10 p-3 text-[12px] text-warning">
                {erros.map((e) => (
                  <div key={e}>{e}</div>
                ))}
              </div>
            ) : null}
            <div className="max-h-64 overflow-y-auto rounded-control border border-border">
              <div className="grid grid-cols-4 bg-bg-app px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                <span>Nome</span>
                <span>Telefone</span>
                <span>Email</span>
                <span>Morada</span>
              </div>
              {linhas.map((l, i) => (
                <div
                  key={`${l.nome}-${i}`}
                  className="grid grid-cols-4 border-t border-border px-3 py-1.5 text-[12px] text-text-primary"
                >
                  <span className="truncate">{l.nome}</span>
                  <span className="truncate">{l.telefone ?? '—'}</span>
                  <span className="truncate">{l.email ?? '—'}</span>
                  <span className="truncate">{l.morada ?? '—'}</span>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-text-tertiary">{linhas.length} contacto(s) válido(s) prontos para importar.</p>
          </div>
        )}
      </HeaderBarModal>

      <PasswordConfirmDialog
        open={passwordOpen}
        title="Confirmar Importação"
        message={`Vais importar ${linhas.length} novo(s) contacto(s) para o sistema. Esta ação não pode ser desfeita automaticamente.`}
        confirmLabel="Importar"
        onConfirm={handleConfirmarImportacao}
        onCancel={() => setPasswordOpen(false)}
      />
    </>
  );
}
