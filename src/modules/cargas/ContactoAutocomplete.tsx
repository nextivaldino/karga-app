import { useEffect, useState } from 'react';
import { UserCircle } from '@phosphor-icons/react';
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

function motivoSemelhanca(contacto: Contacto, value: ContactoFormValue): string {
  const motivos: string[] = [];
  if (value.nome.trim() && contacto.nome.trim().toLowerCase() === value.nome.trim().toLowerCase()) motivos.push('mesmo nome');
  if (value.telefone.trim() && contacto.telefone === value.telefone.trim()) motivos.push('mesmo telefone');
  if (value.morada.trim() && (contacto.morada ?? '').toLowerCase() === value.morada.trim().toLowerCase()) motivos.push('mesma morada');
  return motivos.join(' · ') || 'parecido';
}

export function ContactoAutocomplete({ label, value, onChange, required }: ContactoAutocompleteProps): React.JSX.Element {
  const [results, setResults] = useState<Contacto[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [similares, setSimilares] = useState<Contacto[]>([]);
  const [assinaturaIgnorada, setAssinaturaIgnorada] = useState<string | null>(null);

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

  // Deteção de possíveis duplicados — nomes iguais são o caso óbvio, mas
  // dois contactos com nomes diferentes que partilham telefone ou morada
  // também merecem aviso. Corre sempre que nome/telefone/morada mudam,
  // mesmo que o utilizador nunca abra o dropdown de nome.
  useEffect(() => {
    if (value.contactoId || (!value.nome.trim() && !value.telefone.trim() && !value.morada.trim())) {
      setSimilares([]);
      return;
    }
    const timeout = setTimeout(() => {
      void ipcService.contactos
        .buscarSimilares({ nome: value.nome, telefone: value.telefone, morada: value.morada })
        .then(setSimilares);
    }, 250);
    return () => clearTimeout(timeout);
  }, [value.nome, value.telefone, value.morada, value.contactoId]);

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

  const assinaturaAtual = `${value.nome.trim().toLowerCase()}|${value.telefone.trim()}|${value.morada.trim().toLowerCase()}`;
  const mostrarSimilares = !value.contactoId && similares.length > 0 && assinaturaAtual !== assinaturaIgnorada;

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
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-text-primary transition-colors hover:bg-bg-app"
            >
              <UserCircle size={16} className="shrink-0 text-text-tertiary" />
              <span className="truncate">{contacto.nome}</span>
              {contacto.telefone ? <span className="ml-auto shrink-0 text-text-tertiary">{contacto.telefone}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {value.contactoId ? (
        <p className="mt-1 text-[11px] text-success">Contacto existente selecionado.</p>
      ) : mostrarSimilares ? (
        <div className="mt-1 flex flex-col gap-1.5 rounded-control border border-warning/30 bg-warning/10 px-2.5 py-2 text-[11px]">
          <span className="font-medium text-text-primary">
            {similares.length === 1 ? 'Encontrámos um contacto parecido' : `Encontrámos ${similares.length} contactos parecidos`} — é
            algum destes?
          </span>
          <div className="flex flex-col gap-1">
            {similares.map((contacto) => (
              <div key={contacto.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-text-secondary">
                  {contacto.nome}
                  <span className="text-text-tertiary"> · {motivoSemelhanca(contacto, value)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleSelect(contacto)}
                  className="shrink-0 font-medium text-primary hover:underline"
                >
                  Usar este
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAssinaturaIgnorada(assinaturaAtual)}
            className="self-start text-text-tertiary hover:text-text-secondary hover:underline"
          >
            Não, é um contacto diferente
          </button>
        </div>
      ) : value.nome.trim() ? (
        <p className="mt-1 text-[11px] text-text-tertiary">Novo contacto será criado ao guardar.</p>
      ) : null}
    </div>
  );
}
