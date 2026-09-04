import { useState } from 'react';
import { CaretLeft, DownloadSimple, Stack, UploadSimple } from '@phosphor-icons/react';
import { useNavigation } from '@/hooks/useNavigation';
import { formatValor } from '@/lib/formatValor';
import { LISTA_BG, LISTA_BG_HOVER, LISTA_INK } from './listaVisual';
import type { Contentor } from '@/types';

const COLLAPSED_WIDTH = 44;
const EXPANDED_WIDTH = 200;

interface ListasColumnProps {
  listas: Contentor[];
  onOpenDetalhe: (id: string) => void;
  onExportar: (contentor: Contentor) => void;
}

// Coluna própria para as "Listas" — contentores a sério, só marcados
// como agrupamento leve — para não se misturarem na grelha mensal dos
// contentores normais. Colapsa por largura, mesmo padrão do
// `MainTabs.tsx`. Some por completo se não houver nenhuma Lista.
export function ListasColumn({ listas, onOpenDetalhe, onExportar }: ListasColumnProps): React.JSX.Element | null {
  const [colapsada, setColapsada] = useState(false);
  const { navigate } = useNavigation();

  if (listas.length === 0) return null;

  function handleImportar(lista: Contentor): void {
    navigate('cargas', { contentorId: lista.id, modoEditor: '1' });
  }

  if (colapsada) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-2 border-l border-border bg-bg-surface py-3" style={{ width: COLLAPSED_WIDTH }}>
        <button
          type="button"
          onClick={() => setColapsada(false)}
          title="Mostrar Listas"
          className="relative flex h-9 w-9 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
        >
          <Stack size={18} />
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-pill border-2 border-bg-surface px-1 text-[9px] font-bold"
            style={{ backgroundColor: LISTA_BG, color: LISTA_INK }}
          >
            {listas.length}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 flex-col border-l border-border bg-bg-surface"
      style={{ width: EXPANDED_WIDTH }}
    >
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-3 py-2.5">
        <Stack size={15} className="shrink-0 text-text-secondary" />
        <span className="flex-1 truncate text-[12px] font-semibold uppercase tracking-wide text-text-secondary">
          Listas · {listas.length}
        </span>
        <button
          type="button"
          onClick={() => setColapsada(true)}
          title="Esconder Listas"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-text-tertiary transition-colors hover:bg-bg-app hover:text-text-primary"
        >
          <CaretLeft size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-2">
          {listas.map((lista) => (
            <button
              key={lista.id}
              type="button"
              onClick={() => onOpenDetalhe(lista.id)}
              title={`${lista.codigo} — ${lista.nome}`}
              style={{ backgroundColor: LISTA_BG, color: LISTA_INK }}
              className="group relative flex aspect-square flex-col justify-between overflow-hidden rounded-control p-2 text-left shadow-sm transition-colors hover:brightness-95"
            >
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-bold">{lista.codigo}</span>
                <span className="block truncate text-[11px] opacity-80">{lista.nome}</span>
              </span>

              <span className="block text-[11px] font-medium opacity-80">
                {lista.totalCargas} carga{lista.totalCargas === 1 ? '' : 's'}
                <br />
                {formatValor(lista.valorTotal)}
              </span>

              <span
                className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                style={{ backgroundColor: LISTA_BG_HOVER }}
                onClick={(e) => e.stopPropagation()}
              >
                <span
                  role="button"
                  tabIndex={0}
                  title="Exportar Lista (PDF)"
                  onClick={() => onExportar(lista)}
                  className="flex h-5 w-5 items-center justify-center rounded-control hover:bg-black/10"
                >
                  <DownloadSimple size={11} />
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  title="Importar (Modo Editor — colar do Excel)"
                  onClick={() => handleImportar(lista)}
                  className="flex h-5 w-5 items-center justify-center rounded-control hover:bg-black/10"
                >
                  <UploadSimple size={11} />
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
