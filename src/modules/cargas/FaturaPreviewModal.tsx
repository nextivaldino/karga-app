import { useState } from 'react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { toast } from '@/components/ui/Toast';
import { ipcService } from '@/services/ipcService';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { formatValor } from '@/lib/formatValor';
import { EnviarResumoModal, type ContactoParaRecibo } from '@/modules/cargas/EnviarResumoModal';
import type { CargaComEmissor } from '@/types';

interface FaturaPreviewModalProps {
  open: boolean;
  onClose: () => void;
  cliente: ContactoParaRecibo;
  cargas: CargaComEmissor[];
  contentorId?: string;
}

export function FaturaPreviewModal({ open, onClose, cliente, cargas, contentorId }: FaturaPreviewModalProps): React.JSX.Element {
  const [exporting, setExporting] = useState(false);
  const [preparandoWhatsapp, setPreparandoWhatsapp] = useState(false);
  const [enviarAberto, setEnviarAberto] = useState(false);

  const moeda = cargas[0]?.moeda ?? 'EUR';
  const totalGeral = cargas.reduce((sum, c) => sum + (c.valor ?? 0), 0);
  const totalPago = cargas.filter((c) => c.estadoPagamento === 'pago').reduce((sum, c) => sum + (c.valor ?? 0), 0);
  const totalDevido = cargas.filter((c) => c.estadoPagamento === 'devido').reduce((sum, c) => sum + (c.valor ?? 0), 0);

  async function handleExportar(): Promise<string | null> {
    setExporting(true);
    try {
      const result = await ipcService.faturacao.gerarFatura(cliente!.id, contentorId);
      toast.success(`Fatura guardada em: ${result.path}`);
      return result.path;
    } catch (err) {
      toast.error(cleanIpcError(err));
      return null;
    } finally {
      setExporting(false);
    }
  }

  async function handleWhatsapp(): Promise<void> {
    if (!cliente!.telefone) {
      toast.error('Este contacto não tem telefone registado.');
      return;
    }
    setPreparandoWhatsapp(true);
    try {
      const path = await handleExportar();
      if (!path) return;
      toast.info(`PDF guardado em: ${path}. Pode anexá-lo na conversa que vai abrir.`);
      setEnviarAberto(true);
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setPreparandoWhatsapp(false);
    }
  }

  return (
    <>
    <HeaderBarModal
      open={open}
      onClose={onClose}
      title="Pré-visualização da Fatura"
      widthClassName="max-w-[560px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-control px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
          >
            Fechar
          </button>
          <button
            type="button"
            disabled={preparandoWhatsapp}
            onClick={() => void handleWhatsapp()}
            className="rounded-control border border-border px-4 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-app disabled:opacity-60"
          >
            {preparandoWhatsapp ? 'A preparar...' : 'Enviar por WhatsApp'}
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
      <div className="flex flex-col gap-lg text-[13px]">
        <div>
          <p className="font-semibold text-text-primary">{cliente.nome}</p>
          <p className="text-text-tertiary">{cargas.length} carga(s)</p>
        </div>

        <div className="overflow-hidden rounded-control border border-border">
          <div className="grid grid-cols-[80px_1fr_80px_80px] bg-bg-app px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
            <span>Código</span>
            <span>Nome</span>
            <span>Valor</span>
            <span>Estado</span>
          </div>
          {cargas.map((carga) => (
            <div
              key={carga.id}
              className="grid grid-cols-[80px_1fr_80px_80px] border-t border-border px-3 py-1.5 text-text-primary"
            >
              <span className="truncate">{carga.codigo}</span>
              <span className="truncate">{carga.nome}</span>
              <span>{formatValor(carga.valor, carga.moeda)}</span>
              <span className={carga.estadoPagamento === 'pago' ? 'text-success' : 'text-warning'}>
                {carga.estadoPagamento === 'pago' ? 'Pago' : 'Devido'}
              </span>
            </div>
          ))}
        </div>

        <div className="ml-auto w-56 text-[13px]">
          <div className="flex justify-between py-0.5">
            <span className="text-text-secondary">Total Geral</span>
            <span>{formatValor(totalGeral, moeda)}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-text-secondary">Total Pago</span>
            <span>{formatValor(totalPago, moeda)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 font-semibold">
            <span>Total Devido</span>
            <span>{formatValor(totalDevido, moeda)}</span>
          </div>
        </div>
      </div>
    </HeaderBarModal>

    <EnviarResumoModal
      open={enviarAberto}
      onClose={() => setEnviarAberto(false)}
      contacto={cliente}
      contentorId={contentorId ?? null}
      cargas={cargas}
      onSent={() => setEnviarAberto(false)}
    />
    </>
  );
}
