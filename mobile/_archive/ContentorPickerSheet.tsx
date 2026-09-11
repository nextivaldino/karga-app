import { CheckCircle as CheckCircle2, Stack as Layers, X } from '@phosphor-icons/react';
import { useTheme } from '@/hooks/useTheme';
import { estiloTema } from '@/lib/themeTokens';
import { corTextoSobre } from '@/lib/rowAccents';
import type { ContentorDisponivel } from '@/types';

interface ContentorPickerSheetProps {
  open: boolean;
  onClose: () => void;
  contentores: ContentorDisponivel[];
  contentorAtivoId: string | null;
  onSelecionar: (id: string) => void;
  // 'sheet' (omissão): folha normal, sobe do fundo, tema da app — usada
  // dentro de um formulário já a preencher (Nova Carga). 'dropdown': desce
  // do topo, tema sempre invertido ao da app, largura toda — usada a
  // partir da dynamic island da Home, para ficar visualmente consistente
  // com o painel de notificações que sai do mesmo sítio.
  variant?: 'sheet' | 'dropdown';
  // Só relevante com variant='dropdown' — mesmo offset da ilha (ver
  // HomePage.tsx ISLAND_MENU_TOP), para encostar sem gap.
  topOffset?: string;
  // Quando definido, mostra uma opção extra no topo da lista que chama
  // onSelecionar('') (string vazia = "sem filtro/ver todos"). Só a
  // SubBar de Cargas usa isto — o seletor do Nova Carga nunca passa esta
  // prop, tem sempre de escolher um contentor concreto.
  opcaoTodosLabel?: string;
}

// Seleção de contentor partilhada entre a Home e o Nova Carga — por
// omissão a app já resolve 1 contentor sozinha (utilizador > padrão
// global > primeiro aberto), mas com vários contentores abertos ao mesmo
// tempo em produção, o utilizador precisa de poder escolher outro.
export function ContentorPickerSheet({
  open,
  onClose,
  contentores,
  contentorAtivoId,
  onSelecionar,
  variant = 'sheet',
  topOffset = 'calc(env(safe-area-inset-top) + 64px)',
  opcaoTodosLabel,
}: ContentorPickerSheetProps): React.JSX.Element | null {
  const { theme } = useTheme();
  if (!open) return null;

  const temaInvertido = theme === 'dark' ? 'light' : 'dark';
  const isDropdown = variant === 'dropdown';

  const lista = (
    <div className="max-h-[60vh] overflow-y-auto p-2">
      {opcaoTodosLabel ? (
        (() => {
          const ativo = contentorAtivoId === null;
          const corTexto = corTextoSobre('#006fee');
          return (
            <button
              type="button"
              onClick={() => {
                onSelecionar('');
                onClose();
              }}
              style={ativo ? { backgroundColor: '#006fee' } : undefined}
              className={`flex min-h-touch w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-left ${ativo ? '' : 'active:bg-bg-app'}`}
            >
              <Layers size={16} className={`shrink-0 ${ativo ? '' : 'text-text-tertiary'}`} style={ativo ? { color: corTexto } : undefined} />
              <span className={`flex-1 truncate text-[14px] font-medium ${ativo ? '' : 'text-text-primary'}`} style={ativo ? { color: corTexto } : undefined}>
                {opcaoTodosLabel}
              </span>
              {ativo ? <CheckCircle2 size={16} weight="fill" className="shrink-0" style={{ color: corTexto }} /> : null}
            </button>
          );
        })()
      ) : null}
      {contentores.length === 0 ? (
        <p className="p-4 text-center text-[13px] text-text-tertiary">Sem contentores disponíveis.</p>
      ) : (
        contentores.map((c) => {
          const ativo = c.id === contentorAtivoId;
          const corTexto = corTextoSobre('#006fee');
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onSelecionar(c.id);
                onClose();
              }}
              style={ativo ? { backgroundColor: '#006fee' } : undefined}
              className={`flex min-h-touch w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-left ${
                ativo ? '' : 'active:bg-bg-app'
              }`}
            >
              <Layers size={16} className={`shrink-0 ${ativo ? '' : 'text-text-tertiary'}`} style={ativo ? { color: corTexto } : undefined} />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[14px] font-medium ${ativo ? '' : 'text-text-primary'}`} style={ativo ? { color: corTexto } : undefined}>
                  {c.codigo}
                </p>
                <p className={`truncate text-[12px] ${ativo ? '' : 'text-text-tertiary'}`} style={ativo ? { color: corTexto, opacity: 0.8 } : undefined}>
                  {c.nome}
                </p>
              </div>
              {ativo ? <CheckCircle2 size={16} weight="fill" className="shrink-0" style={{ color: corTexto }} /> : null}
            </button>
          );
        })
      )}
    </div>
  );

  if (isDropdown) {
    return (
      <div className="fixed inset-0 z-[60]" onClick={onClose}>
        <div
          data-theme={temaInvertido}
          style={{ top: topOffset, transformOrigin: 'top', ...estiloTema(temaInvertido) }}
          className="fixed inset-x-4 z-[61] flex max-h-[70vh] animate-[island-menu-in_0.2s_ease-out] flex-col overflow-hidden rounded-b-surface bg-bg-surface shadow-medium"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-3.5 py-2.5">
            <span className="text-[13px] font-semibold text-text-primary">Escolher contentor</span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-control text-text-secondary active:bg-bg-app"
            >
              <X size={16} />
            </button>
          </div>
          {lista}
        </div>
      </div>
    );
  }

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
        {lista}
      </div>
    </div>
  );
}
