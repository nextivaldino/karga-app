import { useState } from 'react';
import { useHubSheet } from '@/hooks/useHubSheet';
import { toast } from '@/components/ui/Toast';

interface EditContactPayload {
  nome: string;
}

// Editar dados do contacto (docs/26 §5.3) — não existe uma tabela de
// "contactos" própria no PWA: nome/telefone/email vêm sempre de uma
// carga concreta desse emissor (docs/17 §6). Este formulário não
// persiste nada sozinho (não há endpoint de update em lib/data.ts) —
// orienta a atualizar os dados na próxima carga desse contacto, em vez
// de fingir gravar algo que a base de dados não guarda por aqui.
export function EditContactSheetContent({ payload }: { payload: EditContactPayload }): React.JSX.Element {
  const { fechar } = useHubSheet();
  const [nome, setNome] = useState(payload.nome);
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');

  const campo = 'w-full rounded-xl border border-border bg-glass px-3 py-[11px] text-[14px] text-text-primary outline-none focus:border-primary';
  const label = 'mb-[5px] block text-[11.5px] text-text-tertiary';

  function handleGuardar(): void {
    toast.info('Para atualizar estes dados, edita a próxima carga deste contacto.');
    fechar();
  }

  return (
    <div>
      <div className="mb-3">
        <label className={label}>Nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} />
      </div>
      <div className="mb-3">
        <label className={label}>Telefone</label>
        <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="+238 9xx xx xx" className={campo} />
      </div>
      <div className="mb-4">
        <label className={label}>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className={campo} />
      </div>
      <button
        type="button"
        onClick={handleGuardar}
        className="w-full rounded-2xl py-3.5 text-[14.5px] font-bold"
        style={{ background: 'linear-gradient(150deg, var(--copper-strong), var(--copper))', color: '#241609' }}
      >
        Guardar alterações
      </button>
    </div>
  );
}
