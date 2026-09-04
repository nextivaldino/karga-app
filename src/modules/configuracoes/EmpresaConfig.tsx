import { useEffect, useRef, useState } from 'react';
import {
  Bank,
  Buildings,
  CaretRight,
  CreditCard,
  EnvelopeSimple,
  IdentificationCard,
  ImageBroken as ImageOff,
  MapPin,
  Phone,
  UploadSimple as Upload,
} from '@phosphor-icons/react';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';

const MOEDAS = ['EUR', 'USD', 'GBP', 'CHF'];

const CHAVES_RECIBO = {
  incluirMorada: 'recibo_incluir_morada',
  incluirContacto: 'recibo_incluir_contacto',
  incluirNif: 'recibo_incluir_nif',
  incluirIban: 'recibo_incluir_iban',
} as const;

type ChaveRecibo = keyof typeof CHAVES_RECIBO;

interface EmpresaForm {
  empresa_origem_nome: string;
  empresa_origem_morada: string;
  empresa_origem_contacto: string;
  empresa_origem_email: string;
  empresa_origem_nif: string;
  empresa_origem_iban: string;
  empresa_origem_banco: string;
  empresa_origem_logo: string;
  empresa_destino_nome: string;
  empresa_destino_morada: string;
  moeda_origem: string;
}

const CAMPOS_VAZIOS: EmpresaForm = {
  empresa_origem_nome: '',
  empresa_origem_morada: '',
  empresa_origem_contacto: '',
  empresa_origem_email: '',
  empresa_origem_nif: '',
  empresa_origem_iban: '',
  empresa_origem_banco: '',
  empresa_origem_logo: '',
  empresa_destino_nome: '',
  empresa_destino_morada: '',
  moeda_origem: 'EUR',
};

// Tamanho generoso o suficiente para um logótipo em PNG/JPEG comprimido,
// mas que não deixa a tabela `settings` (TEXT) crescer sem controlo — o
// upload é rejeitado antes de sequer tentar gravar.
const LOGO_MAX_BYTES = 700_000;

function lerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler o ficheiro.'));
    reader.readAsDataURL(file);
  });
}

export function EmpresaConfig(): React.JSX.Element {
  const [form, setForm] = useState<EmpresaForm>(CAMPOS_VAZIOS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mostrarBancaria, setMostrarBancaria] = useState(false);
  const [prefsRecibo, setPrefsRecibo] = useState<Record<ChaveRecibo, boolean> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void ipcService.settings.getAll().then((all) => {
      setForm({
        empresa_origem_nome: all.empresa_origem_nome ?? '',
        empresa_origem_morada: all.empresa_origem_morada ?? '',
        empresa_origem_contacto: all.empresa_origem_contacto ?? '',
        empresa_origem_email: all.empresa_origem_email ?? '',
        empresa_origem_nif: all.empresa_origem_nif ?? '',
        empresa_origem_iban: all.empresa_origem_iban ?? '',
        empresa_origem_banco: all.empresa_origem_banco ?? '',
        empresa_origem_logo: all.empresa_origem_logo ?? '',
        empresa_destino_nome: all.empresa_destino_nome ?? '',
        empresa_destino_morada: all.empresa_destino_morada ?? '',
        moeda_origem: all.moeda_origem ?? 'EUR',
      });
      setPrefsRecibo({
        incluirMorada: all[CHAVES_RECIBO.incluirMorada] !== '0',
        incluirContacto: all[CHAVES_RECIBO.incluirContacto] !== '0',
        incluirNif: all[CHAVES_RECIBO.incluirNif] !== '0',
        incluirIban: all[CHAVES_RECIBO.incluirIban] === '1',
      });
      setLoading(false);
    });
  }, []);

  async function handleToggleRecibo(chave: ChaveRecibo, valor: boolean): Promise<void> {
    setPrefsRecibo((prev) => (prev ? { ...prev, [chave]: valor } : prev));
    await ipcService.settings.set(CHAVES_RECIBO[chave], valor ? '1' : '0');
  }

  function handleChange<K extends keyof EmpresaForm>(chave: K, valor: string): void {
    setForm((prev) => ({ ...prev, [chave]: valor }));
  }

  async function handleLogoSelecionado(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Escolhe um ficheiro de imagem (PNG, JPEG ou SVG).');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error('Logótipo demasiado grande — usa uma imagem até ~500 KB.');
      return;
    }
    try {
      const base64 = await lerComoBase64(file);
      handleChange('empresa_origem_logo', base64);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao ler a imagem.');
    }
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
          <h2 className="mb-md text-[15px] font-semibold text-text-primary">Logótipo</h2>
          <p className="mb-sm text-[12px] text-text-tertiary">
            Aparece nos documentos exportados (faturas e listas de contentor em PDF).
          </p>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-32 shrink-0 items-center justify-center overflow-hidden rounded-control border border-dashed border-border bg-bg-app">
              {form.empresa_origem_logo ? (
                <img src={form.empresa_origem_logo} alt="Logótipo da empresa" className="max-h-full max-w-full object-contain" />
              ) : (
                <ImageOff size={20} className="text-text-tertiary" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleLogoSelecionado(e)} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-control border border-border bg-bg-surface px-3 py-1.5 text-[12px] font-medium text-text-primary transition-colors hover:bg-bg-app"
              >
                <Upload size={14} /> {form.empresa_origem_logo ? 'Substituir' : 'Carregar imagem'}
              </button>
              {form.empresa_origem_logo ? (
                <button
                  type="button"
                  onClick={() => handleChange('empresa_origem_logo', '')}
                  className="text-left text-[12px] font-medium text-error"
                >
                  Remover
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-md text-[15px] font-semibold text-text-primary">Empresa de Origem</h2>
          <div className="flex flex-col gap-md">
            <FloatingLabelInput
              label="Nome"
              icon={<Buildings size={16} />}
              value={form.empresa_origem_nome}
              onChange={(e) => handleChange('empresa_origem_nome', e.target.value)}
            />
            <FloatingLabelInput
              label="Morada"
              icon={<MapPin size={16} />}
              value={form.empresa_origem_morada}
              onChange={(e) => handleChange('empresa_origem_morada', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-md">
              <FloatingLabelInput
                label="Telefone"
                icon={<Phone size={16} />}
                value={form.empresa_origem_contacto}
                onChange={(e) => handleChange('empresa_origem_contacto', e.target.value)}
              />
              <FloatingLabelInput
                label="Email"
                type="email"
                icon={<EnvelopeSimple size={16} />}
                value={form.empresa_origem_email}
                onChange={(e) => handleChange('empresa_origem_email', e.target.value)}
              />
            </div>
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
          <h2 className="mb-md text-[15px] font-semibold text-text-primary">Informação Fiscal</h2>
          <div className="flex flex-col gap-md">
            <FloatingLabelInput
              label="NIF / Número de Identificação Fiscal (Luxemburgo)"
              icon={<IdentificationCard size={16} />}
              value={form.empresa_origem_nif}
              onChange={(e) => handleChange('empresa_origem_nif', e.target.value)}
            />
          </div>
        </div>

        <div>
          <h2 className="mb-1 text-[15px] font-semibold text-text-primary">Dados nas Mensagens e Recibos</h2>
          <p className="mb-md text-[12px] text-text-tertiary">
            O que da empresa aparece nos recibos enviados por WhatsApp e e-mail aos clientes.
          </p>
          {prefsRecibo ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 rounded-control border border-border bg-bg-app px-3 py-2.5">
                <p className="text-[13px] font-medium text-text-primary">Morada</p>
                <Switch checked={prefsRecibo.incluirMorada} onChange={(v) => void handleToggleRecibo('incluirMorada', v)} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-control border border-border bg-bg-app px-3 py-2.5">
                <p className="text-[13px] font-medium text-text-primary">Contacto (telefone e e-mail)</p>
                <Switch checked={prefsRecibo.incluirContacto} onChange={(v) => void handleToggleRecibo('incluirContacto', v)} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-control border border-border bg-bg-app px-3 py-2.5">
                <p className="text-[13px] font-medium text-text-primary">NIF</p>
                <Switch checked={prefsRecibo.incluirNif} onChange={(v) => void handleToggleRecibo('incluirNif', v)} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-control border border-border bg-bg-app px-3 py-2.5">
                <div>
                  <p className="text-[13px] font-medium text-text-primary">IBAN / Banco</p>
                  <p className="text-[11px] text-text-tertiary">Só aparece quando há valor em dívida na carga.</p>
                </div>
                <Switch checked={prefsRecibo.incluirIban} onChange={(v) => void handleToggleRecibo('incluirIban', v)} />
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setMostrarBancaria((v) => !v)}
            className="flex w-full items-center gap-1.5 text-left text-[15px] font-semibold text-text-primary"
          >
            <CaretRight size={14} className={`shrink-0 text-text-tertiary transition-transform ${mostrarBancaria ? 'rotate-90' : ''}`} />
            Dados Bancários
          </button>
          {mostrarBancaria ? (
            <div className="mt-md flex flex-col gap-md pl-[22px]">
              <FloatingLabelInput
                label="Banco"
                icon={<Bank size={16} />}
                value={form.empresa_origem_banco}
                onChange={(e) => handleChange('empresa_origem_banco', e.target.value)}
              />
              <FloatingLabelInput
                label="IBAN"
                icon={<CreditCard size={16} />}
                value={form.empresa_origem_iban}
                onChange={(e) => handleChange('empresa_origem_iban', e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <div>
          <h2 className="mb-md text-[15px] font-semibold text-text-primary">Agência de Destino (Cabo Verde)</h2>
          <div className="flex flex-col gap-md">
            <FloatingLabelInput
              label="Nome"
              icon={<Buildings size={16} />}
              value={form.empresa_destino_nome}
              onChange={(e) => handleChange('empresa_destino_nome', e.target.value)}
            />
            <FloatingLabelInput
              label="Morada"
              icon={<MapPin size={16} />}
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
