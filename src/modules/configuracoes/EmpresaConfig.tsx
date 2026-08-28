import { useEffect, useState } from 'react';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';

const MOEDAS = ['EUR', 'USD', 'GBP', 'CHF'];

interface EmpresaForm {
  empresa_origem_nome: string;
  empresa_origem_morada: string;
  empresa_origem_contacto: string;
  empresa_destino_nome: string;
  empresa_destino_morada: string;
  moeda_origem: string;
}

const CAMPOS_VAZIOS: EmpresaForm = {
  empresa_origem_nome: '',
  empresa_origem_morada: '',
  empresa_origem_contacto: '',
  empresa_destino_nome: '',
  empresa_destino_morada: '',
  moeda_origem: 'EUR',
};

export function EmpresaConfig(): React.JSX.Element {
  const [form, setForm] = useState<EmpresaForm>(CAMPOS_VAZIOS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void ipcService.settings.getAll().then((all) => {
      setForm({
        empresa_origem_nome: all.empresa_origem_nome ?? '',
        empresa_origem_morada: all.empresa_origem_morada ?? '',
        empresa_origem_contacto: all.empresa_origem_contacto ?? '',
        empresa_destino_nome: all.empresa_destino_nome ?? '',
        empresa_destino_morada: all.empresa_destino_morada ?? '',
        moeda_origem: all.moeda_origem ?? 'EUR',
      });
      setLoading(false);
    });
  }, []);

  function handleChange<K extends keyof EmpresaForm>(chave: K, valor: string): void {
    setForm((prev) => ({ ...prev, [chave]: valor }));
  }

  async function handleGuardar(): Promise<void> {
    setSaving(true);
    try {
      await Promise.all(
        (Object.entries(form) as [keyof EmpresaForm, string][]).map(([chave, valor]) =>
          ipcService.settings.set(chave, valor),
        ),
      );
      toast.success('Dados da empresa guardados.');
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
          <h2 className="mb-md text-[15px] font-semibold text-text-primary">Empresa de Origem</h2>
          <div className="flex flex-col gap-md">
            <FloatingLabelInput
              label="Nome"
              value={form.empresa_origem_nome}
              onChange={(e) => handleChange('empresa_origem_nome', e.target.value)}
            />
            <FloatingLabelInput
              label="Morada"
              value={form.empresa_origem_morada}
              onChange={(e) => handleChange('empresa_origem_morada', e.target.value)}
            />
            <FloatingLabelInput
              label="Contacto"
              value={form.empresa_origem_contacto}
              onChange={(e) => handleChange('empresa_origem_contacto', e.target.value)}
            />
            <FloatingLabelInput
              as="select"
              label="Moeda de Origem"
              value={form.moeda_origem}
              onChange={(e) => handleChange('moeda_origem', e.target.value)}
            >
              {MOEDAS.map((moeda) => (
                <option key={moeda} value={moeda}>
                  {moeda}
                </option>
              ))}
            </FloatingLabelInput>
          </div>
        </div>

        <div>
          <h2 className="mb-md text-[15px] font-semibold text-text-primary">Agência de Destino (Cabo Verde)</h2>
          <div className="flex flex-col gap-md">
            <FloatingLabelInput
              label="Nome"
              value={form.empresa_destino_nome}
              onChange={(e) => handleChange('empresa_destino_nome', e.target.value)}
            />
            <FloatingLabelInput
              label="Morada"
              value={form.empresa_destino_morada}
              onChange={(e) => handleChange('empresa_destino_morada', e.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void handleGuardar()}
          className="self-start rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {saving ? 'A guardar...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
