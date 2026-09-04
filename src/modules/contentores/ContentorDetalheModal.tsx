import { useEffect, useState } from 'react';
import { ArrowsClockwise, Download, PencilSimple as Pencil, Plus } from '@phosphor-icons/react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { formatValor } from '@/lib/formatValor';
import { ipcService } from '@/services/ipcService';
import { ESTADO_CONTENTOR_COLOR_CLASS, ESTADO_CONTENTOR_LABEL } from '@/constants/labels';
import { CargasList } from '@/modules/cargas/CargasList';
import { NovaCargaModal } from '@/modules/cargas/NovaCargaModal';
import { useUsuariosPorId } from '@/hooks/useUsuariosPorId';
import { NovoContentorModal } from './NovoContentorModal';
import { AdicionarCargaExistente } from './AdicionarCargaExistente';
import { ExportarListaModal } from './ExportarListaModal';
import type { CargaComEmissor, Contentor } from '@/types';

interface ContentorDetalheModalProps {
  open: boolean;
  onClose: () => void;
  contentorId: string | null;
  onDataChanged: () => void;
}

export function ContentorDetalheModal({
  open,
  onClose,
  contentorId,
  onDataChanged,
}: ContentorDetalheModalProps): React.JSX.Element | null {
  const [contentor, setContentor] = useState<Contentor | null>(null);
  const [cargas, setCargas] = useState<CargaComEmissor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [exportarOpen, setExportarOpen] = useState(false);
  const [novaCargaOpen, setNovaCargaOpen] = useState(false);
  const [fecharConfirmOpen, setFecharConfirmOpen] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [converterConfirmOpen, setConverterConfirmOpen] = useState(false);
  const [convertendo, setConvertendo] = useState(false);
  const [removendo, setRemovendo] = useState<CargaComEmissor | null>(null);
  const usuariosPorId = useUsuariosPorId();

  async function carregar(): Promise<void> {
    if (!contentorId) return;
    setLoading(true);
    const [c, cs] = await Promise.all([
      ipcService.contentores.obter(contentorId),
      ipcService.cargas.list({ contentorId }),
    ]);
    setContentor(c);
    setCargas(cs);
    setLoading(false);
  }

  useEffect(() => {
    if (!open || !contentorId) return;
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contentorId]);

  function handleRefresh(): void {
    void carregar();
    onDataChanged();
  }

  async function handleRemover(): Promise<void> {
    if (!removendo) return;
    try {
      await ipcService.cargas.update(removendo.id, { contentorId: null });
      toast.success(`Carga ${removendo.codigo} removida do contentor.`);
      setRemovendo(null);
      handleRefresh();
    } catch (err) {
      toast.error(cleanIpcError(err));
      setRemovendo(null);
    }
  }

  async function handleFechar(): Promise<void> {
    if (!contentor) return;
    setFechando(true);
    try {
      await ipcService.contentores.fechar(contentor.id);
      toast.success(`Contentor ${contentor.codigo} fechado.`);
      setFecharConfirmOpen(false);
      handleRefresh();
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setFechando(false);
    }
  }

  async function handleConverter(): Promise<void> {
    if (!contentor) return;
    setConvertendo(true);
    try {
      await ipcService.contentores.converterEmContentor(contentor.id);
      toast.success(`${contentor.codigo} passou a ser um contentor normal.`);
      setConverterConfirmOpen(false);
      handleRefresh();
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setConvertendo(false);
    }
  }

  if (!contentorId) return null;

  const podeEditar = contentor ? !contentor.bloqueado && contentor.estado === 'aberto' : false;
  const podeGerir = podeEditar;

  return (
    <>
      <HeaderBarModal
        open={open}
        onClose={onClose}
        widthClassName="max-w-[720px]"
        title={
          contentor ? (
            <div className="flex items-center justify-center gap-2">
              <span className="font-semibold">{contentor.codigo}</span>
              <span className="text-text-tertiary">·</span>
              <span>{contentor.nome}</span>
              <span className={`text-[12px] ${ESTADO_CONTENTOR_COLOR_CLASS[contentor.estado]}`}>
                {ESTADO_CONTENTOR_LABEL[contentor.estado]}
                {contentor.bloqueado ? ' 🔒' : ''}
              </span>
              {podeEditar ? (
                <button type="button" onClick={() => setEditOpen(true)} className="text-text-tertiary hover:text-primary">
                  <Pencil size={14} />
                </button>
              ) : null}
            </div>
          ) : (
            'Contentor'
          )
        }
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="rounded-control px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
            >
              Fechar Janela
            </button>
            <button
              type="button"
              onClick={() => setExportarOpen(true)}
              className="flex items-center gap-1.5 rounded-control border border-border px-4 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-app"
            >
              <Download size={14} /> Exportar Lista
            </button>
            {contentor?.ehLista ? (
              <button
                type="button"
                onClick={() => setConverterConfirmOpen(true)}
                className="flex items-center gap-1.5 rounded-control border border-border px-4 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-app"
              >
                <ArrowsClockwise size={14} /> Converter em Contentor
              </button>
            ) : null}
            <button
              type="button"
              disabled={!contentor || contentor.estado !== 'aberto' || contentor.bloqueado}
              title={
                contentor?.bloqueado
                  ? 'Desbloqueie o contentor antes de o fechar.'
                  : contentor?.estado !== 'aberto'
                    ? 'Só é possível fechar um contentor aberto.'
                    : undefined
              }
              onClick={() => setFecharConfirmOpen(true)}
              className="rounded-control bg-error px-4 py-2 text-[13px] font-medium text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Fechar Contentor
            </button>
          </>
        }
      >
        {loading || !contentor ? (
          <p className="text-[13px] text-text-tertiary">A carregar...</p>
        ) : (
          <div className="flex flex-col gap-lg">
            <div className="grid grid-cols-3 gap-md">
              <div className="rounded-control border border-border bg-bg-app p-md text-center">
                <div className="text-[18px] font-semibold text-text-primary">{contentor.pesoTotalKg.toFixed(1)} kg</div>
                <div className="text-[11px] text-text-tertiary">Peso Total</div>
              </div>
              <div className="rounded-control border border-border bg-bg-app p-md text-center">
                <div className="text-[18px] font-semibold text-text-primary">{contentor.m3Total.toFixed(3)}</div>
                <div className="text-[11px] text-text-tertiary">m³ Total</div>
              </div>
              <div className="rounded-control border border-border bg-bg-app p-md text-center">
                <div className="text-[18px] font-semibold text-text-primary">{formatValor(contentor.valorTotal)}</div>
                <div className="text-[11px] text-text-tertiary">Valor Total</div>
              </div>
            </div>

            {podeGerir ? (
              <div className="flex items-center gap-2">
                <AdicionarCargaExistente contentorId={contentor.id} onAdded={handleRefresh} />
                <button
                  type="button"
                  onClick={() => setNovaCargaOpen(true)}
                  className="flex shrink-0 items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
                >
                  <Plus size={16} /> Nova Carga
                </button>
              </div>
            ) : null}

            <div className="h-64 overflow-hidden rounded-control border border-border">
              <CargasList
                cargas={cargas}
                loading={false}
                emptyMessage="Nenhuma carga associada."
                onSelectCarga={() => {}}
                onRemove={podeGerir ? (carga) => setRemovendo(carga) : undefined}
                usuariosPorId={usuariosPorId}
              />
            </div>
          </div>
        )}
      </HeaderBarModal>

      <NovoContentorModal open={editOpen} onClose={() => setEditOpen(false)} onSaved={handleRefresh} editingContentor={contentor} />

      <ExportarListaModal open={exportarOpen} onClose={() => setExportarOpen(false)} contentor={contentor} />

      {contentor ? (
        <NovaCargaModal
          open={novaCargaOpen}
          onClose={() => setNovaCargaOpen(false)}
          contentoresAbertos={[contentor]}
          defaultContentorId={contentor.id}
          editingCarga={null}
          onSaved={handleRefresh}
        />
      ) : null}

      <ConfirmDialog
        open={removendo != null}
        title="Remover Carga"
        message={`Remover a carga "${removendo?.codigo}" deste contentor? A carga fica sem contentor associado.`}
        tone="warning"
        confirmLabel="Remover"
        onConfirm={() => void handleRemover()}
        onCancel={() => setRemovendo(null)}
      />

      <ConfirmDialog
        open={fecharConfirmOpen}
        title="Fechar Contentor"
        message="Ao fechar, os totais ficam gravados e deixa de ser possível associar ou remover cargas. Esta ação não pode ser desfeita a partir daqui."
        tone="danger"
        confirmLabel={fechando ? 'A fechar...' : 'Fechar Contentor'}
        onConfirm={() => void handleFechar()}
        onCancel={() => setFecharConfirmOpen(false)}
      />

      <ConfirmDialog
        open={converterConfirmOpen}
        title="Converter em Contentor"
        message={`"${contentor?.codigo}" deixa de aparecer na coluna de Listas e passa a ser tratado como um contentor normal na grelha mensal. As cargas já associadas mantêm-se.`}
        tone="warning"
        confirmLabel={convertendo ? 'A converter...' : 'Converter'}
        onConfirm={() => void handleConverter()}
        onCancel={() => setConverterConfirmOpen(false)}
      />
    </>
  );
}
