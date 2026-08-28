import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import { NovoContentorModal } from '@/modules/contentores/NovoContentorModal';

interface Form {
  prefixo_codigo_carga: string;
  prefixo_codigo_contentor: string;
  dias_contentor_parado: string;
}

const CAMPOS_VAZIOS: Form = {
  prefixo_codigo_carga: 'TF',
  prefixo_codigo_contentor: 'CONT',
  dias_contentor_parado: '14',
};

export function ContentoresConfig(): React.JSX.Element {
  const [form, setForm] = useState<Form>(CAMPOS_VAZIOS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [novoOpen, setNovoOpen] = useState(false);

  useEffect(() => {
    void ipcService.settings.getAll().then((all) => {
      setForm({
        prefixo_codigo_carga: all.prefixo_codigo_carga ?? 'TF',
        prefixo_codigo_contentor: all.prefixo_codigo_contentor ?? 'CONT',
        dias_contentor_parado: all.dias_contentor_parado ?? '14',
      });
      setLoading(false);
    });
  }, []);

  function handleChange<K extends keyof Form>(chave: K, valor: string): void {
    setForm((prev) => ({ ...prev, [chave]: valor }));
  }

  async function handleGuardar(): Promise<void> {
    const dias = Number(form.dias_contentor_parado);
    if (!form.prefixo_codigo_carga.trim() || !form.prefixo_codigo_contentor.trim()) {
      toast.error('Os prefixos de código não podem ficar vazios.');
      return;
    }
    if (!Number.isFinite(dias) || dias <= 0) {
      toast.error('O número de dias tem de ser um número positivo.');
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        ipcService.settings.set('prefixo_codigo_carga', form.prefixo_codigo_carga.trim().toUpperCase()),
        ipcService.settings.set('prefixo_codigo_contentor', form.prefixo_codigo_contentor.trim().toUpperCase()),
        ipcService.settings.set('dias_contentor_parado', String(dias)),
      ]);
      toast.success('Configurações de Contentores e Códigos guardadas.');
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-xl text-[13px] text-text-tertiary">A carregar...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-xl">
      <div className="mx-auto flex max-w-[560px] flex-col gap-lg">
        <div>
          <h2 className="mb-md text-[15px] font-semibold text-text-primary">Prefixos de Código</h2>
          <div className="flex flex-col gap-md">
            <FloatingLabelInput
              label="Prefixo de Código de Carga"
              value={form.prefixo_codigo_carga}
              onChange={(e) => handleChange('prefixo_codigo_carga', e.target.value)}
            />
            <FloatingLabelInput
              label="Prefixo de Código de Contentor"
              value={form.prefixo_codigo_contentor}
              onChange={(e) => handleChange('prefixo_codigo_contentor', e.target.value)}
            />
          </div>
        </div>

        <div>
          <h2 className="mb-md text-[15px] font-semibold text-text-primary">Alertas</h2>
          <FloatingLabelInput
            label='Dias para badge "Parado"'
            type="number"
            min={1}
            value={form.dias_contentor_parado}
            onChange={(e) => handleChange('dias_contentor_parado', e.target.value)}
          />
          <p className="mt-1 text-[12px] text-text-tertiary">
            Nº de dias sem nova carga a partir do qual um contentor aberto mostra o alerta "Parado há X dias".
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleGuardar()}
            className="rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? 'A guardar...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => setNovoOpen(true)}
            className="flex items-center gap-1.5 rounded-control border border-border px-4 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-app"
          >
            <Plus size={16} /> Novo Contentor
          </button>
        </div>
      </div>

      <NovoContentorModal open={novoOpen} onClose={() => setNovoOpen(false)} onSaved={() => setNovoOpen(false)} />
    </div>
  );
}
