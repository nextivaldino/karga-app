import { useState } from 'react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import type { Contentor } from '@/types';

interface ExportarListaModalProps {
  open: boolean;
  onClose: () => void;
  contentor: Contentor | null;
}

const IDIOMAS: { value: 'pt' | 'en' | 'fr'; label: string }[] = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'Inglês' },
  { value: 'fr', label: 'Francês' },
];

export function ExportarListaModal({ open, onClose, contentor }: ExportarListaModalProps): React.JSX.Element | null {
  const [idioma, setIdioma] = useState<'pt' | 'en' | 'fr'>('en');
  const [exporting, setExporting] = useState(false);

  if (!contentor) return null;

  async function handleExportar(): Promise<void> {
    setExporting(true);
    try {
      const result = await ipcService.contentores.exportarLista(contentor!.id, idioma);
      toast.success(`Lista guardada em: ${result.path}`);
      onClose();
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <HeaderBarModal
      open={open}
      onClose={onClose}
      title={`Exportar Lista — ${contentor.codigo}`}
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
            disabled={exporting}
            onClick={() => void handleExportar()}
            className="rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {exporting ? 'A exportar...' : 'Exportar PDF'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-md text-[13px]">
        <p className="text-text-secondary">Escolhe o idioma dos rótulos do documento:</p>
        <div className="flex gap-2">
          {IDIOMAS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setIdioma(opt.value)}
              className={`flex-1 rounded-control border px-3 py-2 text-[13px] transition-colors ${
                idioma === opt.value
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border text-text-secondary hover:bg-bg-app'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </HeaderBarModal>
  );
}
