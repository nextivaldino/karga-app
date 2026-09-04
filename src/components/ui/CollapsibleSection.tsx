import { useState } from 'react';
import type { ReactNode } from 'react';
import { CaretDown } from '@phosphor-icons/react';

interface CollapsibleSectionProps {
  title: string;
  // Chave curta e única da secção (ex: 'home-resumo') — guarda a
  // preferência de aberta/fechada no localStorage, para o utilizador não
  // ter de recolher a mesma área sempre que reabre a app.
  storageKey: string;
  defaultOpen?: boolean;
  actions?: ReactNode;
  // Linha compacta mostrada quando a secção está recolhida — info básica
  // num relance, sem precisar de expandir para ver o essencial.
  summary: ReactNode;
  children: ReactNode;
}

function lerEstadoGuardado(chave: string, defaultOpen: boolean): boolean {
  try {
    const guardado = localStorage.getItem(`home-seccao:${chave}`);
    return guardado === null ? defaultOpen : guardado === '1';
  } catch {
    return defaultOpen;
  }
}

export function CollapsibleSection({
  title,
  storageKey,
  defaultOpen = true,
  actions,
  summary,
  children,
}: CollapsibleSectionProps): React.JSX.Element {
  const [aberta, setAberta] = useState(() => lerEstadoGuardado(storageKey, defaultOpen));

  function alternar(): void {
    setAberta((atual) => {
      const novo = !atual;
      try {
        localStorage.setItem(`home-seccao:${storageKey}`, novo ? '1' : '0');
      } catch {
        // localStorage indisponível — a preferência simplesmente não persiste
      }
      return novo;
    });
  }

  return (
    <section>
      <div className="mb-sm flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={alternar}
          className="flex items-center gap-1.5 text-[14px] font-semibold text-text-primary"
        >
          <CaretDown size={13} className={`text-text-tertiary transition-transform ${aberta ? '' : '-rotate-90'}`} />
          {title}
        </button>
        {actions}
      </div>
      {aberta ? children : summary}
    </section>
  );
}
