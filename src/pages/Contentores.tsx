import { useState } from 'react';
import { Check, CheckCircle as CheckCircle2, Download, Eye, EyeSlash as EyeOff, Funnel as Filter, SquaresFour as LayoutGrid, List, Lock, PencilSimple as Pencil, Plus, Boat as Ship, Star, Trash as Trash2, LockOpen as Unlock } from '@phosphor-icons/react';
import { ContextToolbar } from '@/components/layout/ContextToolbar';
import { ContainerPickerButton } from '@/components/ui/ContainerPickerButton';
import { ViewSwitcher } from '@/components/ui/ViewSwitcher';
import { ContextMenu, type ContextMenuItem } from '@/components/ui/ContextMenu';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import { SincronizacaoCargaCard } from '@/modules/cargas/SincronizacaoCargaCard';
import { ContentoresIconsView } from '@/modules/contentores/ContentoresIconsView';
import { ContentoresListView } from '@/modules/contentores/ContentoresListView';
import { ContentorDetalheModal } from '@/modules/contentores/ContentorDetalheModal';
import { ContentorPreviewPanel } from '@/modules/contentores/ContentorPreviewPanel';
import { ExportarListaModal } from '@/modules/contentores/ExportarListaModal';
import { ListasColumn } from '@/modules/contentores/ListasColumn';
import { NovoContentorModal } from '@/modules/contentores/NovoContentorModal';
import { EliminarContentorDialog } from '@/modules/contentores/EliminarContentorDialog';
import { useContentoresPage } from '@/modules/contentores/useContentoresPage';
import { useContentorAtivo } from '@/hooks/useContentorAtivo';
import { useStatusBarText } from '@/hooks/useStatusBarText';
import { ESTADO_CONTENTOR_LABEL } from '@/constants/labels';
import type { Contentor, EstadoContentor } from '@/types';

const ESTADOS_FILTRO: EstadoContentor[] = ['aberto', 'em_transito', 'fechado', 'entregue'];

interface MenuState {
  contentor: Contentor;
  x: number;
  y: number;
}

export function Contentores(): React.JSX.Element {
  const {
    contentores,
    mesesDisponiveis,
    loading,
    viewMode,
    setViewMode,
    mostrarOcultos,
    setMostrarOcultos,
    filtroEstado,
    setFiltroEstado,
    filtroMes,
    setFiltroMes,
    limiteDiasParado,
    refresh,
  } = useContentoresPage();
  const { contentoresAbertos, selectedContentorId, selectContentor, loadingContentores } = useContentorAtivo();
  const [novoOpen, setNovoOpen] = useState(false);
  const [editingContentor, setEditingContentor] = useState<Contentor | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [deleting, setDeleting] = useState<Contentor | null>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [exportando, setExportando] = useState<Contentor | null>(null);
  const [filtroMenuPos, setFiltroMenuPos] = useState<{ x: number; y: number } | null>(null);

  const filtrosAtivos = filtroEstado !== '' || filtroMes !== '' || mostrarOcultos;
  const listas = contentores.filter((c) => c.ehLista);
  const contentoresNormais = contentores.filter((c) => !c.ehLista);

  useStatusBarText(loading ? null : `${contentores.length} contentor${contentores.length === 1 ? '' : 'es'}`);

  function checkIcon(active: boolean): React.ReactNode {
    return active ? <Check size={14} className="text-primary" /> : <span className="inline-block w-[14px]" />;
  }

  const filtroMenuItems: ContextMenuItem[] = [
    { key: 'h-estado', header: 'Estado' },
    { key: 'estado-todos', label: 'Todos os estados', icon: checkIcon(filtroEstado === ''), onClick: () => setFiltroEstado('') },
    ...ESTADOS_FILTRO.map((estado) => ({
      key: `estado-${estado}`,
      label: ESTADO_CONTENTOR_LABEL[estado],
      icon: checkIcon(filtroEstado === estado),
      onClick: () => setFiltroEstado(estado),
    })),
    { key: 'div-1', divider: true },
    { key: 'h-mes', header: 'Mês' },
    { key: 'mes-todos', label: 'Todos os meses', icon: checkIcon(filtroMes === ''), onClick: () => setFiltroMes('') },
    ...mesesDisponiveis.map((mes) => ({
      key: `mes-${mes}`,
      label: mes,
      icon: checkIcon(filtroMes === mes),
      onClick: () => setFiltroMes(mes),
    })),
    { key: 'div-2', divider: true },
    {
      key: 'ocultos',
      label: mostrarOcultos ? 'A mostrar contentores ocultos' : 'Mostrar contentores ocultos',
      icon: mostrarOcultos ? <EyeOff size={14} /> : <Eye size={14} />,
      onClick: () => setMostrarOcultos(!mostrarOcultos),
    },
  ];

  function handleSelect(contentor: Contentor): void {
    setDetalheId(contentor.id);
  }

  function handlePreview(contentor: Contentor): void {
    setPreviewId(contentor.id);
  }

  function handleContextMenu(contentor: Contentor, x: number, y: number): void {
    setMenu({ contentor, x, y });
  }

  async function handleMarcarEmTransito(contentor: Contentor): Promise<void> {
    try {
      await ipcService.contentores.marcarEmTransito(contentor.id);
      toast.success(`Contentor ${contentor.codigo} marcado como Em Trânsito.`);
      refresh();
    } catch (err) {
      toast.error(cleanIpcError(err));
    }
  }

  async function handleMarcarEntregue(contentor: Contentor): Promise<void> {
    try {
      await ipcService.contentores.marcarEntregue(contentor.id);
      toast.success(`Contentor ${contentor.codigo} marcado como Entregue.`);
      refresh();
    } catch (err) {
      toast.error(cleanIpcError(err));
    }
  }

  async function handleBloquear(contentor: Contentor): Promise<void> {
    try {
      if (contentor.bloqueado) {
        await ipcService.contentores.desbloquear(contentor.id);
        toast.success(`Contentor ${contentor.codigo} desbloqueado.`);
      } else {
        await ipcService.contentores.bloquear(contentor.id);
        toast.success(`Contentor ${contentor.codigo} bloqueado.`);
      }
      refresh();
    } catch (err) {
      toast.error(cleanIpcError(err));
    }
  }

  async function handleOcultar(contentor: Contentor): Promise<void> {
    try {
      if (contentor.oculto) {
        await ipcService.contentores.mostrar(contentor.id);
        toast.success(`Contentor ${contentor.codigo} voltou a ficar visível.`);
      } else {
        await ipcService.contentores.ocultar(contentor.id);
        toast.success(`Contentor ${contentor.codigo} ocultado.`);
      }
      refresh();
    } catch (err) {
      toast.error(cleanIpcError(err));
    }
  }

  async function handleDefinirPadraoGlobal(contentor: Contentor): Promise<void> {
    try {
      await ipcService.contentores.definirPadraoGlobal(contentor.id);
      toast.success(`Contentor ${contentor.codigo} definido como padrão PWA.`);
      refresh();
    } catch (err) {
      toast.error(cleanIpcError(err));
    }
  }

  function buildMenuItems(contentor: Contentor): ContextMenuItem[] {
    const podeEditar = !contentor.bloqueado && contentor.estado === 'aberto';
    const podeEliminar = contentor.estado === 'aberto' && contentor.totalCargas === 0;

    return [
      {
        key: 'editar',
        label: 'Editar',
        icon: <Pencil size={14} />,
        onClick: () => setEditingContentor(contentor),
        disabled: !podeEditar,
        disabledReason: 'Só é possível editar contentores abertos e não bloqueados.',
      },
      {
        key: 'exportar',
        label: 'Exportar Lista (PDF)',
        icon: <Download size={14} />,
        onClick: () => setExportando(contentor),
      },
      {
        key: 'em-transito',
        label: 'Marcar Em Trânsito',
        icon: <Ship size={14} />,
        onClick: () => void handleMarcarEmTransito(contentor),
        disabled: contentor.estado !== 'fechado' || contentor.bloqueado,
        disabledReason: 'Só disponível para contentores fechados e não bloqueados.',
      },
      {
        key: 'entregue',
        label: 'Marcar Entregue',
        icon: <CheckCircle2 size={14} />,
        onClick: () => void handleMarcarEntregue(contentor),
        disabled: contentor.estado !== 'em_transito',
        disabledReason: 'Só disponível para contentores em trânsito.',
      },
      {
        key: 'bloquear',
        label: contentor.bloqueado ? 'Desbloquear' : 'Bloquear',
        icon: contentor.bloqueado ? <Unlock size={14} /> : <Lock size={14} />,
        onClick: () => void handleBloquear(contentor),
      },
      {
        key: 'ocultar',
        label: contentor.oculto ? 'Mostrar' : 'Ocultar',
        icon: contentor.oculto ? <Eye size={14} /> : <EyeOff size={14} />,
        onClick: () => void handleOcultar(contentor),
      },
      {
        key: 'padrao-pwa',
        label: contentor.padraoGlobal ? '★ Padrão PWA (atual)' : 'Marcar como padrão PWA',
        icon: <Star size={14} weight={contentor.padraoGlobal ? 'fill' : 'regular'} />,
        onClick: () => void handleDefinirPadraoGlobal(contentor),
        disabled: contentor.padraoGlobal || contentor.estado !== 'aberto',
        disabledReason: contentor.padraoGlobal
          ? 'Este já é o contentor padrão para envios PWA.'
          : 'Só um contentor aberto pode ser o padrão PWA.',
      },
      {
        key: 'eliminar',
        label: 'Eliminar',
        icon: <Trash2 size={14} />,
        danger: true,
        onClick: () => setDeleting(contentor),
        disabled: !podeEliminar,
        disabledReason: 'Só disponível para contentores abertos e sem cargas — use Ocultar.',
      },
    ];
  }

  return (
    <div className="flex h-full flex-col">
      <ContextToolbar>
        <ContainerPickerButton
          contentores={contentoresAbertos}
          selectedId={selectedContentorId}
          onSelect={selectContentor}
          loading={loadingContentores}
          onExport={setExportando}
        />

        <div className="absolute left-1/2 top-1/2 z-40 -translate-x-1/2" style={{ marginTop: -18 }}>
          <SincronizacaoCargaCard contentoresAbertos={contentoresAbertos} selectedContentorId={selectedContentorId} onImported={refresh} />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <ViewSwitcher
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: 'icones', label: 'Ícones', icon: <LayoutGrid size={15} /> },
              { value: 'lista', label: 'Lista', icon: <List size={15} /> },
            ]}
          />

          <button
            type="button"
            onClick={() => setNovoOpen(true)}
            title="Novo Contentor"
            className="flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-pill bg-primary px-0 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-primary-hover lg:w-auto lg:px-4"
          >
            <Plus size={18} className="shrink-0" />
            <span className="hidden lg:inline">Novo Contentor</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setFiltroMenuPos({ x: rect.left, y: rect.bottom + 4 });
            }}
            title="Filtros"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-[var(--toolbar-hover)]"
          >
            <Filter size={19} />
            {filtrosAtivos ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-pill bg-primary" /> : null}
          </button>
        </div>
      </ContextToolbar>

      <ContextMenu
        open={filtroMenuPos != null}
        x={filtroMenuPos?.x ?? 0}
        y={filtroMenuPos?.y ?? 0}
        items={filtroMenuItems}
        onClose={() => setFiltroMenuPos(null)}
      />

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="flex h-full items-center justify-center text-[13px] text-text-tertiary">A carregar...</div>
          ) : viewMode === 'icones' ? (
            <ContentoresIconsView
              contentores={contentoresNormais}
              limiteDiasParado={limiteDiasParado}
              onPreview={handlePreview}
              onSelect={handleSelect}
              onContextMenu={handleContextMenu}
            />
          ) : (
            <ContentoresListView
              contentores={contentoresNormais}
              limiteDiasParado={limiteDiasParado}
              onPreview={handlePreview}
              onSelect={handleSelect}
              onContextMenu={handleContextMenu}
            />
          )}
        </div>

        <ListasColumn listas={listas} onOpenDetalhe={setDetalheId} onExportar={setExportando} />
      </div>

      <NovoContentorModal open={novoOpen} onClose={() => setNovoOpen(false)} onSaved={refresh} />

      <NovoContentorModal
        open={editingContentor != null}
        onClose={() => setEditingContentor(null)}
        onSaved={refresh}
        editingContentor={editingContentor}
      />

      <ContextMenu
        open={menu != null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        items={menu ? buildMenuItems(menu.contentor) : []}
        onClose={() => setMenu(null)}
      />

      <EliminarContentorDialog
        open={deleting != null}
        contentor={deleting}
        onClose={() => setDeleting(null)}
        onConfirmed={() => {
          setDeleting(null);
          refresh();
        }}
      />

      <ContentorDetalheModal
        open={detalheId != null}
        onClose={() => setDetalheId(null)}
        contentorId={detalheId}
        onDataChanged={refresh}
      />

      <ContentorPreviewPanel
        open={previewId != null}
        onClose={() => setPreviewId(null)}
        contentorId={previewId}
        limiteDiasParado={limiteDiasParado}
        onAbrirDetalhe={(id) => {
          setPreviewId(null);
          setDetalheId(id);
        }}
      />

      <ExportarListaModal open={exportando != null} onClose={() => setExportando(null)} contentor={exportando} />
    </div>
  );
}
