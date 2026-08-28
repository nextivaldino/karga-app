import { useEffect, useState } from 'react';
import { Check, Filter, Plus, Search, Users } from 'lucide-react';
import { ContextToolbar } from '@/components/layout/ContextToolbar';
import { ContextMenu, type ContextMenuItem } from '@/components/ui/ContextMenu';
import { Switch } from '@/components/ui/Switch';
import { CargasEditorGrid } from '@/modules/cargas/CargasEditorGrid';
import { CargasList } from '@/modules/cargas/CargasList';
import { ContactosDoContentorPanel } from '@/modules/cargas/ContactosDoContentorPanel';
import { FaturacaoView } from '@/modules/cargas/FaturacaoView';
import { NovaCargaModal } from '@/modules/cargas/NovaCargaModal';
import { useCargasPage } from '@/modules/cargas/useCargasPage';
import { useNavigation } from '@/hooks/useNavigation';
import { openGlobalSearch } from '@/lib/openGlobalSearch';
import { ipcService } from '@/services/ipcService';
import type { CargaComEmissor, EstadoPagamento, OrigemPwaLinha } from '@/types';

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
  const [contactosPanelOpen, setContactosPanelOpen] = useState(false);
  const [modoEditor, setModoEditor] = useState(false);
  const [subAba, setSubAba] = useState<SubAba>('lista');
  const [filtroMenuPos, setFiltroMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [origensPwa, setOrigensPwa] = useState<OrigemPwaLinha[]>([]);

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, params?.entidadeId, params?.contentorId]);

  const filtroAtivo = PAGAMENTO_FILTROS.find((f) => f.value === estadoPagamento);

  const filtroMenuItems: ContextMenuItem[] = [
    ...PAGAMENTO_FILTROS.map((filtro) => ({
      key: filtro.label,
      label: filtro.label,
      icon:
        estadoPagamento === filtro.value ? (
          <Check size={14} className="text-primary" />
        ) : (
          <span className="inline-block w-[14px]" />
        ),
      onClick: () => setEstadoPagamento(filtro.value),
    })),
    ...(origensPwa.length > 0
      ? [
          { key: 'divider-pwa', divider: true },
          { key: 'header-pwa', header: 'Utilizador PWA' },
          {
            key: 'pwa-todas',
            label: 'Todas as origens',
            icon:
              origemPwaUserId === undefined ? (
                <Check size={14} className="text-primary" />
              ) : (
                <span className="inline-block w-[14px]" />
              ),
            onClick: () => setOrigemPwaUserId(undefined),
          },
          ...origensPwa.map((origem) => ({
            key: origem.userId,
            label: `${origem.nome} (${origem.total})`,
            icon:
              origemPwaUserId === origem.userId ? (
                <Check size={14} className="text-primary" />
              ) : (
                <span className="inline-block w-[14px]" />
              ),
            onClick: () => setOrigemPwaUserId(origem.userId),
          })),
        ]
      : []),
  ];

  return (
    <div className="flex h-full flex-col">
      <ContextToolbar>
        {loadingContentores ? (
          <span className="text-[13px] text-text-tertiary">A carregar contentores...</span>
        ) : contentoresAbertos.length === 0 ? (
          <span className="text-[13px] text-text-tertiary">Nenhum contentor aberto</span>
        ) : (
          <label className="flex h-9 items-center gap-2 text-[13px] text-text-secondary">
            Contêiner:
            <select
              value={selectedContentorId ?? ''}
              onChange={(e) => selectContentor(e.target.value)}
              className="h-9 rounded-control border border-border bg-bg-input px-2 text-[13px] text-text-primary outline-none focus:border-primary"
            >
              {contentoresAbertos.map((contentor) => (
                <option key={contentor.id} value={contentor.id}>
                  {contentor.codigo} — {contentor.nome}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="h-6 w-px shrink-0 bg-border" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!selectedContentorId}
            onClick={() => setContactosPanelOpen(true)}
            title={!selectedContentorId ? 'Sem contentor selecionado' : 'Contactos deste contentor'}
            className="flex h-9 w-9 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-[var(--toolbar-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Users size={19} />
          </button>
        </div>

        <div className="h-6 w-px shrink-0 bg-border" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openGlobalSearch}
            title="Pesquisar (⌘K)"
            className="flex h-9 w-9 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-[var(--toolbar-hover)]"
          >
            <Search size={19} />
          </button>

          {subAba === 'lista' && !modoEditor ? (
            <button
              type="button"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setFiltroMenuPos({ x: rect.left, y: rect.bottom + 4 });
              }}
              title={`Filtro de pagamento: ${filtroAtivo?.label ?? 'Todos'}`}
              className="relative flex h-9 w-9 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-[var(--toolbar-hover)]"
            >
              <Filter size={19} />
              {filtroAtivo?.dotClass ? (
                <span className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-pill ${filtroAtivo.dotClass}`} />
              ) : null}
            </button>
          ) : null}
        </div>

        {subAba === 'lista' ? (
          <>
            <div className="h-6 w-px shrink-0 bg-border" />
            <div className="flex h-9 items-center gap-2">
              <Switch checked={modoEditor} onChange={setModoEditor} label="Modo Editor" />
            </div>
          </>
        ) : null}

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            disabled={contentoresAbertos.length === 0}
            onClick={handleOpenNovaCarga}
            title={contentoresAbertos.length === 0 ? 'Sem contentores abertos' : undefined}
            className="flex h-9 items-center gap-1.5 rounded-pill bg-primary px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} /> Nova Carga
          </button>

          <div className="inline-flex h-9 items-center gap-0.5 rounded-control bg-bg-input p-0.5">
            <button
              type="button"
              onClick={() => setSubAba('lista')}
              className={`rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                subAba === 'lista' ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Lista
            </button>
            <button
              type="button"
              onClick={() => setSubAba('faturacao')}
              className={`rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                subAba === 'faturacao' ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Faturação
            </button>
          </div>
        </div>
      </ContextToolbar>

      <div className="min-h-0 flex-1">
        {subAba === 'faturacao' ? (
          <FaturacaoView contentorId={selectedContentorId} />
        ) : modoEditor ? (
          <CargasEditorGrid contentorId={selectedContentorId} onDataChanged={refreshCargas} />
        ) : (
          <CargasList
            cargas={cargas}
            loading={loadingCargas}
            emptyMessage={
              selectedContentorId ? 'Nenhuma carga encontrada neste contentor.' : 'Selecione ou crie um contentor aberto.'
            }
            onSelectCarga={handleSelectCarga}
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

      <ContactosDoContentorPanel
        open={contactosPanelOpen}
        onClose={() => setContactosPanelOpen(false)}
        contentorId={selectedContentorId}
      />

      <ContextMenu
        open={filtroMenuPos != null}
        x={filtroMenuPos?.x ?? 0}
        y={filtroMenuPos?.y ?? 0}
        items={filtroMenuItems}
        onClose={() => setFiltroMenuPos(null)}
      />
    </div>
  );
}
