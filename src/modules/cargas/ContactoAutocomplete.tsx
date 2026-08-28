import { useEffect, useState } from 'react';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { ipcService } from '@/services/ipcService';
import type { Contacto } from '@/types';

export interface ContactoFormValue {
  nome: string;
  contactoId: string | null;
  telefone: string;
  email: string;
  morada: string;
  nif: string;
}

export const EMPTY_CONTACTO_VALUE: ContactoFormValue = {
  nome: '',
  contactoId: null,
  telefone: '',
  email: '',
  morada: '',
  nif: '',
};

interface ContactoAutocompleteProps {
  label: string;
  value: ContactoFormValue;
  onChange: (value: ContactoFormValue) => void;
  required?: boolean;
}

export function ContactoAutocomplete({ label, value, onChange, required }: ContactoAutocompleteProps): React.JSX.Element {
  const [results, setResults] = useState<Contacto[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!value.nome.trim() || value.contactoId) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      void ipcService.contactos.search(value.nome.trim(), 5).then(setResults);
    }, 200);
    return () => clearTimeout(timeout);
  }, [value.nome, value.contactoId]);

  function handleSelect(contacto: Contacto): void {
    onChange({
      nome: contacto.nome,
      contactoId: contacto.id,
      telefone: contacto.telefone ?? '',
      email: contacto.email ?? '',
      morada: contacto.morada ?? '',
      nif: contacto.nif ?? '',
    });
    setShowDropdown(false);
  }

  return (
    <div className="relative">
      <FloatingLabelInput
        label={label}
        value={value.nome}
        required={required}
        onChange={(e) => {
          onChange({ ...value, nome: e.target.value, contactoId: null });
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
      />

      {showDropdown && results.length > 0 ? (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-control border border-border bg-bg-surface shadow-lg">
          {results.map((contacto) => (
            <button
              key={contacto.id}
              type="button"
              onMouseDown={() => handleSelect(contacto)}
              className="block w-full px-3 py-2 text-left text-[13px] text-text-primary transition-colors hover:bg-bg-app"
            >
              {contacto.nome}
              {contacto.telefone ? <span className="ml-2 text-text-tertiary">{contacto.telefone}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {value.contactoId ? (
        <p className="mt-1 text-[11px] text-success">Contacto existente selecionado.</p>
      ) : value.nome.trim() ? (
        <p className="mt-1 text-[11px] text-text-tertiary">Novo contacto será criado ao guardar.</p>
      ) : null}
    </div>
  );
}
