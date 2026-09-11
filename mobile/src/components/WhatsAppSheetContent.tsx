import { useState } from 'react';
import { useHubSheet } from '@/hooks/useHubSheet';

interface WhatsAppPayload {
  nome: string;
  telefone?: string | null;
}

function abrirWhatsapp(telefone: string, mensagem: string): void {
  const digitos = telefone.replace(/[^0-9]/g, '');
  window.open(`https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`, '_blank');
}

// Enviar por WhatsApp (docs/26 §5.3/§8) — reaproveita o telefone já
// guardado numa das cargas desse contacto (o PWA não tem tabela de
// contactos própria, ver docs/17 §6).
export function WhatsAppSheetContent({ payload }: { payload: WhatsAppPayload }): React.JSX.Element {
  const { fechar } = useHubSheet();
  const [mensagem, setMensagem] = useState('Resumo das suas cargas em anexo.');

  return (
    <div>
      <div className="mb-4">
        <label className="mb-[5px] block text-[11.5px] text-text-tertiary">Mensagem</label>
        <input
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          className="w-full rounded-xl border border-border bg-glass px-3 py-[11px] text-[14px] text-text-primary outline-none focus:border-primary"
        />
      </div>
      <button
        type="button"
        disabled={!payload.telefone}
        onClick={() => {
          if (payload.telefone) abrirWhatsapp(payload.telefone, mensagem);
          fechar();
        }}
        className="w-full rounded-2xl py-3.5 text-[14.5px] font-bold disabled:opacity-50"
        style={{ background: 'linear-gradient(150deg, var(--copper-strong), var(--copper))', color: '#241609' }}
      >
        Abrir WhatsApp
      </button>
      {!payload.telefone ? (
        <p className="mt-2 text-center text-[12px] text-text-tertiary">{payload.nome} não tem telefone guardado.</p>
      ) : null}
    </div>
  );
}
