import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { ipcService } from '@/services/ipcService';

interface LicenseScreenProps {
  machineId: string;
  onActivated: () => void;
}

export function LicenseScreen({ machineId, onActivated }: LicenseScreenProps): React.JSX.Element {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const ok = await ipcService.license.activate(key);
      if (!ok) {
        setError('Licença inválida para esta máquina.');
        return;
      }
      onActivated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-bg-app px-6" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-[420px] rounded-surface border border-border bg-bg-surface p-xl shadow-sm"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="mb-lg flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-surface bg-primary-light text-primary">
            <KeyRound size={24} />
          </div>
          <h1 className="text-[20px] font-semibold text-text-primary">Ativação da Licença</h1>
          <p className="text-[13px] text-text-secondary">
            Introduz a chave de licença fornecida para ativar o Kraga Desktop nesta máquina.
          </p>
        </div>

        <FloatingLabelInput
          label="Chave de Licença"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          required
        />

        {error ? <p className="mt-3 text-[13px] text-error">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-lg w-full rounded-control bg-primary py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {submitting ? 'A verificar...' : 'Ativar'}
        </button>

        <div className="mt-lg rounded-control border border-border bg-bg-app p-3 text-[11px] text-text-tertiary">
          <p className="mb-1 font-medium text-text-secondary">Identificador desta máquina (para pedir a chave):</p>
          <code className="break-all">{machineId}</code>
        </div>
      </form>
    </div>
  );
}
