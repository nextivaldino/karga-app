import { CaretLeft as ChevronLeft } from '@phosphor-icons/react';

interface ContactDetailHeaderProps {
  nome: string;
  numCargas: number;
  valorTotalLabel: string;
  onVoltar: () => void;
  onEditar: () => void;
  onWhatsapp: () => void;
}

function iniciaisDe(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Cabeçalho do detalhe de um contacto (docs/26 §5.3) — voltar, avatar,
// nome, estatísticas acumuladas, ações Editar dados / WhatsApp.
export function ContactDetailHeader({ nome, numCargas, valorTotalLabel, onVoltar, onEditar, onWhatsapp }: ContactDetailHeaderProps): React.JSX.Element {
  return (
    <div className="mx-1.5 mb-3 mt-0.5 rounded-[22px] border border-border bg-glass p-4">
      <button type="button" onClick={onVoltar} className="mb-3 flex items-center gap-1.5 text-[13px] text-text-secondary">
        <ChevronLeft size={13} weight="bold" /> Contactos
      </button>
      <div className="flex items-center gap-3">
        <span
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-border-strong text-[14px] font-bold text-primary-hover"
          style={{ background: 'linear-gradient(145deg, rgba(200,147,97,0.35), rgba(200,147,97,0.12))' }}
        >
          {iniciaisDe(nome)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[17px] font-bold text-text-primary">{nome}</p>
          <p className="mt-0.5 text-[12px] text-text-tertiary">
            {numCargas} {numCargas === 1 ? 'carga' : 'cargas'} · {valorTotalLabel} acumulado
          </p>
        </div>
      </div>
      <div className="mt-3.5 flex gap-2">
        <button
          type="button"
          onClick={onEditar}
          className="flex-1 rounded-xl border border-border-strong bg-glass-strong py-2.5 text-center text-[12.5px] font-semibold text-text-primary"
        >
          Editar dados
        </button>
        <button
          type="button"
          onClick={onWhatsapp}
          className="flex-1 rounded-xl border py-2.5 text-center text-[12.5px] font-semibold text-success"
          style={{ background: 'rgba(79,166,160,0.16)', borderColor: 'rgba(79,166,160,0.32)' }}
        >
          WhatsApp
        </button>
      </div>
    </div>
  );
}
