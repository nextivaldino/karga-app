import { useEffect, useRef, useState } from 'react';
import { CaretDown as ChevronDown } from '@phosphor-icons/react';
import { FloatingLabelInput } from './FloatingLabelInput';

export interface IndicativoPais {
  codigo: string; // ex: '+352'
  nome: string; // ex: 'Luxemburgo'
}

interface PhoneFieldProps {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  paises: IndicativoPais[];
  corClass?: string;
  fieldSize?: 'md' | 'sm';
}

// O valor guardado é sempre "<indicativo> <número>" (ex: "+352 621 123
// 456") — mesmo formato de texto livre que o campo já usava, só que agora
// com o indicativo sempre presente. Ao reabrir um item já preenchido
// (editar do lote), o indicativo é reconhecido a partir do próprio valor.
function separar(v: string | null, paises: IndicativoPais[]): { codigo: string; numero: string } {
  const base = (v ?? '').trim();
  const encontrado = [...paises].sort((a, b) => b.codigo.length - a.codigo.length).find((p) => base.startsWith(p.codigo));
  if (encontrado) return { codigo: encontrado.codigo, numero: base.slice(encontrado.codigo.length).trim() };
  return { codigo: paises[0]?.codigo ?? '', numero: base };
}

// Seletor de indicativo (Emissor: Luxemburgo/França; Recetor: só Cabo
// Verde, fixo) embutido como leftSlot do FloatingLabelInput — mantém o
// mesmo estilo de campo em toda a app, sem input "solto" à parte.
export function PhoneField({ label, value, onChange, paises, corClass = 'text-text-secondary', fieldSize = 'sm' }: PhoneFieldProps): React.JSX.Element {
  const inicial = separar(value, paises);
  const [codigo, setCodigo] = useState(inicial.codigo);
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selecionavel = paises.length > 1;

  useEffect(() => {
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function escolher(p: IndicativoPais, numeroAtual: string): void {
    setCodigo(p.codigo);
    setAberto(false);
    onChange(numeroAtual.trim() ? `${p.codigo} ${numeroAtual.trim()}` : null);
  }

  const numero = separar(value, paises).numero;

  return (
    <FloatingLabelInput
      label={label}
      inputMode="tel"
      value={numero}
      onChange={(e) => onChange(e.target.value.trim() ? `${codigo} ${e.target.value.trim()}` : null)}
      fieldSize={fieldSize}
      leftSlot={
        <div ref={ref} className="relative">
          <button
            type="button"
            disabled={!selecionavel}
            onClick={() => setAberto((v) => !v)}
            className={`flex items-center gap-0.5 text-[13px] font-medium ${corClass}`}
          >
            {codigo}
            {selecionavel ? <ChevronDown size={11} /> : null}
          </button>
          {aberto ? (
            <div className="absolute left-0 top-6 z-20 w-32 overflow-hidden rounded-control border border-border bg-bg-surface shadow-lg">
              {paises.map((p) => (
                <button
                  key={p.codigo}
                  type="button"
                  onClick={() => escolher(p, numero)}
                  className="flex min-h-touch w-full items-center justify-between px-3 text-left text-[13px] text-text-primary active:bg-bg-app"
                >
                  <span>{p.nome}</span>
                  <span className="text-text-tertiary">{p.codigo}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      }
    />
  );
}
