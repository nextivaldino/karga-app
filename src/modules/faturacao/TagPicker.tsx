import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Tag } from '@phosphor-icons/react';
import { ipcService } from '@/services/ipcService';
import type { Etiqueta } from '@/types';

const PALETA_CORES = ['#3584e4', '#2ec27e', '#e5a50a', '#e01b24', '#9141ac', '#1c71d8', '#63452c', '#26a269'];

interface TagPickerProps {
  contactoId: string;
  etiquetasDoContacto: Etiqueta[];
  todasEtiquetas: Etiqueta[];
  onChange: () => void;
}

// Popover simples: lista as etiquetas existentes com check para
// atribuir/remover, e um campo para criar uma nova inline (modelo
// "escreve o nome, cria-se e atribui-se logo") — sem ecrã de gestão
// separado, a criação acontece no fluxo natural de rotular um cliente.
export function TagPicker({ contactoId, etiquetasDoContacto, todasEtiquetas, onChange }: TagPickerProps): React.JSX.Element {
  const [aberto, setAberto] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [criando, setCriando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const idsAtivas = new Set(etiquetasDoContacto.map((e) => e.id));

  async function handleToggle(etiqueta: Etiqueta): Promise<void> {
    if (idsAtivas.has(etiqueta.id)) {
      await ipcService.etiquetas.detach(contactoId, etiqueta.id);
    } else {
      await ipcService.etiquetas.attach(contactoId, etiqueta.id);
    }
    onChange();
  }

  async function handleCriar(): Promise<void> {
    const nome = novoNome.trim();
    if (!nome) return;
    setCriando(true);
    try {
      const cor = PALETA_CORES[todasEtiquetas.length % PALETA_CORES.length] ?? '#3584e4';
      const etiqueta = await ipcService.etiquetas.create({ nome, cor });
      await ipcService.etiquetas.attach(contactoId, etiqueta.id);
      setNovoNome('');
      onChange();
    } finally {
      setCriando(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        title="Etiquetas"
        className="flex h-7 w-7 items-center justify-center rounded-control text-text-tertiary transition-colors hover:bg-bg-app hover:text-text-primary"
      >
        <Tag size={15} />
      </button>
      {aberto ? (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-control border border-border bg-bg-surface p-2 shadow-lg">
          <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
            {todasEtiquetas.length === 0 ? (
              <p className="px-2 py-1 text-[12px] text-text-tertiary">Sem etiquetas ainda.</p>
            ) : (
              todasEtiquetas.map((etiqueta) => (
                <button
                  key={etiqueta.id}
                  type="button"
                  onClick={() => void handleToggle(etiqueta)}
                  className="flex items-center gap-2 rounded-control px-2 py-1.5 text-left text-[13px] text-text-primary transition-colors hover:bg-bg-app"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-pill" style={{ backgroundColor: etiqueta.cor }} />
                  <span className="flex-1 truncate">{etiqueta.nome}</span>
                  {idsAtivas.has(etiqueta.id) ? <Check size={13} className="shrink-0 text-primary" /> : null}
                </button>
              ))
            )}
          </div>
          <div className="mt-2 flex items-center gap-1 border-t border-border pt-2">
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCriar();
              }}
              placeholder="Nova etiqueta..."
              className="h-8 flex-1 rounded-control border border-border bg-bg-input px-2 text-[12px] text-text-primary outline-none focus:border-primary"
            />
            <button
              type="button"
              disabled={criando || !novoNome.trim()}
              onClick={() => void handleCriar()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
