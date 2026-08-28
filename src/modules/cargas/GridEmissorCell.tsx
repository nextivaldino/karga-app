import { useEffect, useState } from 'react';
import { ipcService } from '@/services/ipcService';
import type { Contacto } from '@/types';

interface GridEmissorCellProps {
  rowIndex: number;
  value: string;
  contactoId: string | null;
  onChange: (nome: string, contactoId: string | null) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  hasError: boolean;
  errorMessage?: string;
}

export function GridEmissorCell({
  rowIndex,
  value,
  contactoId,
  onChange,
  onBlur,
  onKeyDown,
  hasError,
  errorMessage,
}: GridEmissorCellProps): React.JSX.Element {
  const [results, setResults] = useState<Contacto[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!value.trim() || contactoId) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      void ipcService.contactos.search(value.trim(), 5).then(setResults);
    }, 200);
    return () => clearTimeout(timeout);
  }, [value, contactoId]);

  return (
    <div className="relative h-full">
      <input
        data-row={rowIndex}
        data-col="emissor"
        value={value}
        title={errorMessage}
        onChange={(e) => {
          onChange(e.target.value, null);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => {
          setShowDropdown(false);
          onBlur();
        }}
        onKeyDown={onKeyDown}
        className={`h-full w-full border-0 bg-transparent px-1.5 text-[12px] text-text-primary outline-none focus:bg-primary-light ${
          hasError ? 'ring-1 ring-inset ring-error' : ''
        }`}
      />
      {showDropdown && results.length > 0 ? (
        <div className="absolute left-0 top-full z-20 w-48 overflow-hidden border border-border bg-bg-surface shadow-lg">
          {results.map((contacto) => (
            <button
              key={contacto.id}
              type="button"
              onMouseDown={() => {
                onChange(contacto.nome, contacto.id);
                setShowDropdown(false);
              }}
              className="block w-full px-2 py-1.5 text-left text-[12px] text-text-primary hover:bg-bg-app"
            >
              {contacto.nome}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
