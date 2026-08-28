import { useEffect, useState } from 'react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import type { Contentor } from '@/types';

interface EliminarContentorDialogProps {
  open: boolean;
  contentor: Contentor | null;
  onClose: () => void;
  onConfirmed: () => void;
}

export function EliminarContentorDialog({
  open,
  contentor,
  onClose,
  onConfirmed,
}: EliminarContentorDialogProps): React.JSX.Element | null {
  const [confirmText, setConfirmText] = useState('');
  const [exportarExcel, setExportarExcel] = useState(false);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmText('');
    setExportarExcel(false);
  }, [open]);

  if (!contentor) return null;

  const podeConfirmar = confirmText.trim() === contentor.codigo;

  async function handleConfirmar(): Promise<void> {
    if (!contentor || !podeConfirmar) return;
    setProcessando(true);
    try {
      if (exportarExcel) {
        await ipcService.relatorios.exportar(
          'excel',
          `Contentor Eliminado — ${contentor.codigo}`,
          [
            { header: 'Código', key: 'codigo' },
            { header: 'Nome', key: 'nome' },
            { header: 'Categoria', key: 'categoria' },
            { header: 'Mês Referência', key: 'mesReferencia' },
            { header: 'Criado em', key: 'criadoEm' },
            { header: 'Eliminado em', key: 'eliminadoEm' },
          ],
          [
            {
              codigo: contentor.codigo,
              nome: contentor.nome,
              categoria: contentor.categoria ?? '—',
              mesReferencia: contentor.mesReferencia,
              criadoEm: new Intl.DateTimeFormat('pt-PT').format(new Date(contentor.createdAt)),
              eliminadoEm: new Intl.DateTimeFormat('pt-PT').format(new Date()),
            },
          ],
          `contentor-eliminado-${contentor.codigo.replace(/\s+/g, '-')}`,
        );
      }
      await ipcService.contentores.eliminar(contentor.id);
      toast.success(`Contentor ${contentor.codigo} eliminado.`);
      onConfirmed();
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <HeaderBarModal
      open={open}
      onClose={onClose}
      title="Eliminar Contentor"
      widthClassName="max-w-[440px]"
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
            disabled={!podeConfirmar || processando}
            onClick={() => void handleConfirmar()}
            className="rounded-control bg-error px-4 py-2 text-[13px] font-medium text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processando ? 'A eliminar...' : 'Eliminar Contentor'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-lg">
        <p className="text-[14px] text-text-primary">
          Tens a certeza que queres eliminar o contentor <span className="font-semibold">{contentor.codigo}</span>? Esta
          ação não pode ser desfeita.
        </p>

        <label className="flex items-center gap-2 text-[13px] text-text-secondary">
          <input
            type="checkbox"
            checked={exportarExcel}
            onChange={(e) => setExportarExcel(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Exportar registo para Excel antes de eliminar (opcional)
        </label>

        <div>
          <p className="mb-1.5 text-[12px] text-text-secondary">
            Escreve <span className="font-semibold text-text-primary">{contentor.codigo}</span> para confirmar:
          </p>
          <FloatingLabelInput label="Código do contentor" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </div>
      </div>
    </HeaderBarModal>
  );
}
