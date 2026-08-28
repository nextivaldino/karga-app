import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import type { CargaComEmissor } from '@/types';

interface AdicionarCargaExistenteProps {
  contentorId: string;
  onAdded: () => void;
}

export function AdicionarCargaExistente({ contentorId, onAdded }: AdicionarCargaExistenteProps): React.JSX.Element {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<CargaComEmissor[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!texto.trim()) {
      setResultados([]);
      return;
    }
    const timeout = setTimeout(() => {
      void ipcService.cargas.list({ contentorId: null, texto: texto.trim() }).then(setResultados);
    }, 200);
    return () => clearTimeout(timeout);
  }, [texto]);

  async function handleAdd(carga: CargaComEmissor): Promise<void> {
    try {
      await ipcService.cargas.update(carga.id, { contentorId });
      toast.success(`Carga ${carga.codigo} associada a este contentor.`);
      setTexto('');
      setResultados([]);
      setShowDropdown(false);
      onAdded();
    } catch (err) {
      toast.error(cleanIpcError(err));
    }
  }

  return (
    <div className="relative flex-1">
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
      <input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder="Adicionar carga existente (sem contentor)..."
        className="w-full rounded-control border border-border bg-bg-input py-1.5 pl-8 pr-3 text-[13px] text-text-primary outline-none focus:border-primary"
      />
      {showDropdown && resultados.length > 0 ? (
        <div className="absolute left-0 top-full z-10 mt-1 w-full overflow-hidden rounded-control border border-border bg-bg-surface shadow-lg">
          {resultados.map((carga) => (
            <button
              key={carga.id}
              type="button"
              onMouseDown={() => void handleAdd(carga)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-text-primary hover:bg-bg-app"
            >
              <span className="truncate">
                {carga.codigo} — {carga.nome}
              </span>
              <span className="shrink-0 text-text-tertiary">{carga.emissorNome}</span>
            </button>
          ))}
        </div>
      ) : showDropdown && texto.trim() ? (
        <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-control border border-border bg-bg-surface p-3 text-[12px] text-text-tertiary shadow-lg">
          Nenhuma carga sem contentor encontrada com esse termo.
        </div>
      ) : null}
    </div>
  );
}
