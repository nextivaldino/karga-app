import { CaretRight as ChevronRight, WhatsappLogo } from '@phosphor-icons/react';

interface ContactRowProps {
  nome: string;
  numCargas: number;
  valorTotalLabel: string;
  onAbrir: () => void;
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

// Linha de contacto (docs/26 §5.3) — avatar com iniciais, nome, nº de
// cargas + valor total, atalho WhatsApp, chevron para o detalhe (que
// reaproveita o mesmo CargaRow da lista de Cargas, filtrado).
export function ContactRow({ nome, numCargas, valorTotalLabel, onAbrir, onWhatsapp }: ContactRowProps): React.JSX.Element {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onAbrir();
      }}
      className="flex min-h-touch items-center gap-3 border-b border-border px-3 py-3 last:border-b-0 active:bg-white/[0.03]"
    >
      <span
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-border-strong text-[14px] font-bold text-primary-hover"
        style={{ background: 'linear-gradient(145deg, rgba(200,147,97,0.35), rgba(200,147,97,0.12))' }}
      >
        {iniciaisDe(nome)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-text-primary">{nome}</p>
        <p className="mt-0.5 truncate text-[11.5px] text-text-tertiary">
          {numCargas} {numCargas === 1 ? 'carga' : 'cargas'} · {valorTotalLabel}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onWhatsapp();
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-success"
        style={{ background: 'rgba(79,166,160,0.14)', border: '1px solid rgba(79,166,160,0.3)' }}
      >
        <WhatsappLogo size={15} weight="fill" />
      </button>
      <ChevronRight size={13} className="shrink-0 text-text-tertiary" />
    </div>
  );
}
