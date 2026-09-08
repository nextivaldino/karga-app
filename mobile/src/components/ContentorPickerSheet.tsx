import { CheckCircle as CheckCircle2, Stack as Layers, X } from '@phosphor-icons/react';
import type { ContentorDisponivel } from '@/types';

interface ContentorPickerSheetProps {
  open: boolean;
  onClose: () => void;
  contentores: ContentorDisponivel[];
  contentorAtivoId: string | null;
  onSelecionar: (id: string) => void;
}

// Folha de seleção partilhada entre a Home e o Nova Carga — por omissão a
// app já resolve 1 contentor sozinha (utilizador > padrão global >
// primeiro aberto), mas com vários contentores abertos ao mesmo tempo em
// produção, o utilizador precisa de poder escolher outro.
export function ContentorPickerSheet({
  open,
  onClose,
  contentores,
  contentorAtivoId,
  onSelecionar,
}: ContentorPickerSheetProps): React.JSX.Element | null {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full rounded-t-surface border-t border-border bg-bg-surface pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-medium"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-[15px] font-semibold text-text-primary">Escolher contentor</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-control text-text-secondary active:bg-bg-app"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {contentores.length === 0 ? (
            <p className="p-4 text-center text-[13px] text-text-tertiary">Sem contentores disponíveis.</p>
          ) : (
            contentores.map((c) => {
              const ativo = c.id === contentorAtivoId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelecionar(c.id);
                    onClose();
                  }}
                  className={`flex min-h-touch w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-left ${
                    ativo ? 'bg-primary/10' : 'active:bg-bg-app'
                  }`}
                >
                  <Layers size={16} className={`shrink-0 ${ativo ? 'text-primary' : 'text-text-tertiary'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-text-primary">{c.codigo}</p>
                    <p className="truncate text-[12px] text-text-tertiary">{c.nome}</p>
                  </div>
                  {ativo ? <CheckCircle2 size={16} weight="fill" className="shrink-0 text-primary" /> : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
