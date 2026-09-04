import { useEffect, useState } from 'react';
import { Check, CheckCircle, Clock, DeviceMobile, List, Plus, Wallet } from '@phosphor-icons/react';
import { ContextToolbar } from '@/components/layout/ContextToolbar';
import { ContainerPickerButton } from '@/components/ui/ContainerPickerButton';
import { Switch } from '@/components/ui/Switch';
import { ViewSwitcher } from '@/components/ui/ViewSwitcher';
import { CargasEditorGrid } from '@/modules/cargas/CargasEditorGrid';
import { CargasList } from '@/modules/cargas/CargasList';
import { NovaCargaModal } from '@/modules/cargas/NovaCargaModal';
import { SincronizacaoCargaCard } from '@/modules/cargas/SincronizacaoCargaCard';
import { useCargasPage } from '@/modules/cargas/useCargasPage';
import { SYNC_HEADER_BG, SYNC_INK } from '@/modules/sync/syncVisual';
import { FaturacaoPage } from '@/modules/faturacao/FaturacaoPage';
import { ExportarListaModal } from '@/modules/contentores/ExportarListaModal';
import { useNavigation } from '@/hooks/useNavigation';
import { useStatusBarText } from '@/hooks/useStatusBarText';
import { ipcService } from '@/services/ipcService';
import type { CargaComEmissor, Contentor, EstadoPagamento, OrigemPwaLinha } from '@/types';

type SubAba = 'lista' | 'faturacao';

const PAGAMENTO_FILTROS: { value: EstadoPagamento | undefined; label: string; dotClass?: string }[] = [
  { value: undefined, label: 'Todos' },
  { value: 'devido', label: 'Devido', dotClass: 'bg-warning' },
  { value: 'pago', label: 'Pago', dotClass: 'bg-success' },
];

export function Cargas(): React.JSX.Element {
  const {
    contentoresAbertos,
    selectedContentorId,
    selectContentor,
    loadingContentores,
    cargas,
    loadingCargas,
    estadoPagamento,
    setEstadoPagamento,
    origemPwaUserId,
    setOrigemPwaUserId,
    refreshCargas,
  } = useCargasPage();

  const { page, params } = useNavigation();

  const [novaCargaOpen, setNovaCargaOpen] = useState(false);
  const [editingCarga, setEditingCarga] = useState<CargaComEmissor | null>(null);
  const [modoEditor, setModoEditor] = useState(false);
  const [subAba, setSubAba] = useState<SubAba>('lista');
  const [origensPwa, setOrigensPwa] = useState<OrigemPwaLinha[]>([]);
  const [exportando, setExportando] = useState<Contentor | null>(null);

  useEffect(() => {
    void ipcService.cargas.listOrigensPwa().then(setOrigensPwa);
  }, []);

  function handleOpenNovaCarga(): void {
    setEditingCarga(null);
    setNovaCargaOpen(true);
  }

  function handleSelectCarga(carga: CargaComEmissor): void {
    setEditingCarga(carga);
    setNovaCargaOpen(true);
  }

  useEffect(() => {
    if (page !== 'cargas') return;
    if (params?.entidadeId) {
      const entidadeId = params.entidadeId;
      void ipcService.cargas.list({ id: entidadeId }).then((items) => {
        const carga = items[0];
        if (!carga) return;
        if (carga.contentorId) selectContentor(carga.contentorId);
        setSubAba('lista');
        setModoEditor(false);
        handleSelectCarga(carga);
      });
    } else if (params?.contentorId) {
      selectContentor(params.contentorId);
      setSubAba('lista');
      setModoEditor(false);
    } else if (params?.novaCarga) {
      setSubAba('lista');
      setModoEditor(false);
      handleOpenNovaCarga();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, params?.entidadeId, params?.contentorId, params?.novaCarga]);

  const filtroAtivo = PAGAMENTO_FILTROS.find((f) => f.value === estadoPagamento);
  const nomeOrigemPwa = new Map(origensPwa.map((o) => [o.userId, o.nome]));

  useStatusBarText(selectedContentorId ? `${cargas.length} carga${cargas.length === 1 ? '' : 's'}` : null);

  const mostrarFiltro = subAba === 'lista' && !modoEditor;

  function checkOuEspaco(ativo: boolean): React.JSX.Element {
    return ativo ? (
      <Check size={14} weight="bold" className="shrink-0 text-primary" />
    ) : (
      <span className="inline-block w-[14px] shrink-0" />
    );
  }

  const filtroSection = (
    <div className="py-1.5">
      <div className="px-3.5 pb-1.5 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
        Pagamento
      </div>
      {PAGAMENTO_FILTROS.map((filtro) => (
        <button
          key={filtro.label}
          type="button"
          onClick={() => setEstadoPagamento(filtro.value)}
          className="flex w-full items-center gap-2 px-3.5 py-1.5 text-left text-[13px] text-text-primary transition-colors hover:bg-[var(--toolbar-hover)]"
        >
          {checkOuEspaco(estadoPagamento === filtro.value)}
          <span className="min-w-0 flex-1 truncate">{filtro.label}</span>
          {filtro.value === 'devido' ? <Clock size={14} weight="fill" className="shrink-0 text-warning" /> : null}
          {filtro.value === 'pago' ? <CheckCircle size={14} weight="fill" className="shrink-0 text-success" /> : null}
        </button>
      ))}

      {origensPwa.length > 0 ? (
        <>
          <div className="my-1.5 h-px bg-border" />
          <div className="px-3.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            Origem PWA
          </div>
          <button
            type="button"
            onClick={() => setOrigemPwaUserId(undefined)}
            className="flex w-full items-center gap-2 px-3.5 py-1.5 text-left text-[13px] text-text-primary transition-colors hover:bg-[var(--toolbar-hover)]"
          >
            {checkOuEspaco(origemPwaUserId === undefined)}
            <span className="min-w-0 flex-1 truncate">Todas as origens</span>
          </button>
          {origensPwa.map((origem) => (
            <button
              key={origem.userId}
              type="button"
              onClick={() => setOrigemPwaUserId(origem.userId)}
              className="flex w-full items-center gap-2 px-3.5 py-1.5 text-left text-[13px] text-text-primary transition-colors hover:bg-[var(--toolbar-hover)]"
            >
              {checkOuEspaco(origemPwaUserId === origem.userId)}
              <DeviceMobile size={14} className="shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate">{origem.nome}</span>
              <span className="shrink-0 text-[11px] text-text-tertiary">{origem.total}</span>
            </button>
          ))}
        </>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <ContextToolbar>
        <ContainerPickerButton
          contentores={contentoresAbertos}
          selectedId={selectedContentorId}
          onSelect={selectContentor}
          loading={loadingContentores}
          indicatorDotClass={mostrarFiltro ? filtroAtivo?.dotClass : undefined}
          extraSection={mostrarFiltro ? filtroSection : undefined}
          onExport={setExportando}
        />

        {/* Centrado verticalmente como os outros elementos da barra (top-1/2
            + margin-top fixo de metade da altura fechada, 36px), em vez de
            -translate-y-1/2 — esse recalcularia o centro com a altura atual
            do cartão e fá-lo-ia crescer para cima E para baixo ao abrir. */}
        <div className="absolute left-1/2 top-1/2 z-40 -translate-x-1/2" style={{ marginTop: -18 }}>
          <SincronizacaoCargaCard
            contentoresAbertos={contentoresAbertos}
            selectedContentorId={selectedContentorId}
            onImported={refreshCargas}
          />
        </div>

        <div className="ml-4">
          <ViewSwitcher
            value={subAba}
            onChange={setSubAba}
            options={[
              { value: 'lista', label: 'Lista', icon: <List size={15} />, title: 'Lista — gerir e ver cargas', badge: cargas.length },
              { value: 'faturacao', label: 'Faturação', icon: <Wallet size={15} />, title: 'Faturação — controlar pagamentos' },
            ]}
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            disabled={contentoresAbertos.length === 0}
            onClick={handleOpenNovaCarga}
            title={contentoresAbertos.length === 0 ? 'Sem contentores abertos' : 'Nova Carga'}
            className="flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-pill px-0 text-[13px] font-semibold shadow-sm transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:px-4"
            style={{ backgroundColor: SYNC_HEADER_BG, color: SYNC_INK }}
          >
            <Plus size={18} weight="bold" className="shrink-0" />
            <span className="hidden lg:inline">Nova Carga</span>
          </button>

          {subAba === 'lista' ? (
            <div className="flex h-9 shrink-0 items-center">
              <Switch checked={modoEditor} onChange={setModoEditor} label="Modo Editor" />
            </div>
          ) : null}
        </div>
      </ContextToolbar>

      <div className="min-h-0 flex-1">
        {subAba === 'faturacao' ? (
          <FaturacaoPage contentorId={selectedContentorId} contentoresAbertos={contentoresAbertos} />
        ) : modoEditor ? (
          <CargasEditorGrid contentorId={selectedContentorId} contentoresAbertos={contentoresAbertos} onDataChanged={refreshCargas} />
        ) : (
          <CargasList
            cargas={cargas}
            loading={loadingCargas}
            emptyMessage={
              selectedContentorId ? 'Nenhuma carga encontrada neste contentor.' : 'Selecione ou crie um contentor aberto.'
            }
            onSelectCarga={handleSelectCarga}
            nomeOrigemPwa={nomeOrigemPwa}
            contentoresAbertos={contentoresAbertos}
            onDataChanged={refreshCargas}
          />
        )}
      </div>

      <NovaCargaModal
        open={novaCargaOpen}
        onClose={() => setNovaCargaOpen(false)}
        contentoresAbertos={contentoresAbertos}
        defaultContentorId={selectedContentorId}
        editingCarga={editingCarga}
        onSaved={refreshCargas}
      />

      <ExportarListaModal open={exportando != null} onClose={() => setExportando(null)} contentor={exportando} />
    </div>
  );
}
