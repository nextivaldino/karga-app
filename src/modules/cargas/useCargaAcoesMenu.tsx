import { useState } from 'react';
import { Check, PencilSimple as Pencil, Stack, Trash as Trash2 } from '@phosphor-icons/react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ContextMenu, type ContextMenuItem } from '@/components/ui/ContextMenu';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import type { CargaComEmissor, Contentor } from '@/types';

interface UseCargaAcoesMenuOptions {
  onEditar: (carga: CargaComEmissor) => void;
  contentoresAbertos?: Contentor[];
  onDataChanged?: () => void;
}

// Menu de contexto de uma carga (Editar / Pago-Devido / Mover para
// contentor / Arquivar) — reaproveitado tal e qual entre a lista de
// Cargas e o painel de Faturação, que tinham cada um a sua cópia quase
// idêntica desta lógica. `renderMenu()` já inclui o ContextMenu e o
// ConfirmDialog de arquivar, prontos a montar no fim do JSX do chamador.
export function useCargaAcoesMenu({ onEditar, contentoresAbertos, onDataChanged }: UseCargaAcoesMenuOptions) {
  const [menuCarga, setMenuCarga] = useState<{ carga: CargaComEmissor; x: number; y: number } | null>(null);
  const [arquivando, setArquivando] = useState<CargaComEmissor | null>(null);

  function abrirMenu(carga: CargaComEmissor, x: number, y: number): void {
    setMenuCarga({ carga, x, y });
  }

  function abrirMenuNoBotao(e: React.MouseEvent<HTMLElement>, carga: CargaComEmissor): void {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuCarga({ carga, x: rect.right, y: rect.bottom + 4 });
  }

  async function handleTogglePagamento(carga: CargaComEmissor): Promise<void> {
    const novoEstado = carga.estadoPagamento === 'pago' ? 'devido' : 'pago';
    await ipcService.cargas.update(carga.id, { estadoPagamento: novoEstado });
    onDataChanged?.();
  }

  async function handleMover(carga: CargaComEmissor, novoContentorId: string): Promise<void> {
    try {
      await ipcService.cargas.update(carga.id, { contentorId: novoContentorId });
      toast.success('Carga movida.');
      onDataChanged?.();
    } catch (err) {
      toast.error(cleanIpcError(err));
    }
  }

  async function handleArquivar(): Promise<void> {
    if (!arquivando) return;
    try {
      await ipcService.cargas.archive(arquivando.id);
      toast.success('Carga arquivada.');
      setArquivando(null);
      onDataChanged?.();
    } catch (err) {
      toast.error(cleanIpcError(err));
      setArquivando(null);
    }
  }

  function buildMenuItems(carga: CargaComEmissor): ContextMenuItem[] {
    return [
      { key: 'editar', label: 'Editar', icon: <Pencil size={14} />, onClick: () => onEditar(carga) },
      {
        key: 'pagamento',
        label: carga.estadoPagamento === 'pago' ? 'Marcar como Devido' : 'Marcar como Pago',
        icon: <Check size={14} />,
        onClick: () => void handleTogglePagamento(carga),
      },
      ...(contentoresAbertos && contentoresAbertos.length > 0
        ? ([
            { key: 'div-mover', divider: true },
            { key: 'h-mover', header: 'Mover para contentor' },
            ...contentoresAbertos
              .filter((c) => c.id !== carga.contentorId)
              .map((c) => ({
                key: `mover-${c.id}`,
                label: `${c.codigo} — ${c.nome}`,
                icon: <Stack size={14} />,
                onClick: () => void handleMover(carga, c.id),
              })),
          ] as ContextMenuItem[])
        : []),
      { key: 'div-arquivar', divider: true },
      { key: 'arquivar', label: 'Arquivar', icon: <Trash2 size={14} />, danger: true, onClick: () => setArquivando(carga) },
    ];
  }

  function renderMenu(): React.JSX.Element {
    return (
      <>
        <ContextMenu
          open={menuCarga != null}
          x={menuCarga?.x ?? 0}
          y={menuCarga?.y ?? 0}
          items={menuCarga ? buildMenuItems(menuCarga.carga) : []}
          onClose={() => setMenuCarga(null)}
        />
        <ConfirmDialog
          open={arquivando != null}
          title="Arquivar Carga"
          message={`Tens a certeza que queres arquivar "${arquivando?.nome}"? Fica fora das listagens, o histórico não se perde.`}
          tone="danger"
          confirmLabel="Arquivar"
          onConfirm={() => void handleArquivar()}
          onCancel={() => setArquivando(null)}
        />
      </>
    );
  }

  return { abrirMenu, abrirMenuNoBotao, renderMenu, handleTogglePagamento };
}
