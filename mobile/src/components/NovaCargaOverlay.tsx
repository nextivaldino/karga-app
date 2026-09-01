import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { Switch } from '@/components/ui/Switch';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { toast } from '@/components/ui/Toast';
import { listContentoresDisponiveis, enviarCargasPendentes } from '@/lib/data';
import { guardarSugestaoNome, listarSugestoesNomes } from '@/lib/contactSuggestions';
import type { ContentorDisponivel, NovaCargaPendenteInput } from '@/types';

const CAMPOS_VAZIOS: NovaCargaPendenteInput = {
  contentorId: '',
  emissorNome: '',
  emissorTelefone: '',
  emissorEmail: '',
  recetorNome: '',
  recetorTelefone: '',
  nomeCarga: '',
  comprimentoCm: null,
  larguraCm: null,
  alturaCm: null,
  pesoKg: null,
  valor: null,
  pago: false,
  notas: '',
};

function numOrNull(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function NovaCargaOverlay(): React.JSX.Element | null {
  const { aberto, prefill, fechar } = useNovaCargaOverlay();
  const { pwaUser } = useAuth();
  const [contentores, setContentores] = useState<ContentorDisponivel[]>([]);
  const [form, setForm] = useState<NovaCargaPendenteInput>(CAMPOS_VAZIOS);
  const [lote, setLote] = useState<NovaCargaPendenteInput[]>([]);
  const [enviando, setEnviando] = useState(false);
  const sugestoes = listarSugestoesNomes();

  useEffect(() => {
    if (!aberto) return;
    listContentoresDisponiveis()
      .then((cs) => {
        setContentores(cs);
        setForm(prefill ?? { ...CAMPOS_VAZIOS, contentorId: cs[0]?.id ?? '' });
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Falha ao carregar contentores.'));
    setLote([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  if (!aberto) return null;

  function update<K extends keyof NovaCargaPendenteInput>(key: K, value: NovaCargaPendenteInput[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleAdicionar(): void {
    if (!form.contentorId) {
      toast.error('Escolhe um contentor de destino.');
      return;
    }
    if (!form.emissorNome.trim() || !form.recetorNome.trim() || !form.nomeCarga.trim()) {
      toast.error('Emissor, recetor e nome da carga são obrigatórios.');
      return;
    }
    guardarSugestaoNome(form.emissorNome);
    guardarSugestaoNome(form.recetorNome);
    setLote((l) => [...l, form]);
    setForm((f) => ({
      ...CAMPOS_VAZIOS,
      contentorId: f.contentorId,
      emissorNome: f.emissorNome,
      emissorTelefone: f.emissorTelefone,
      emissorEmail: f.emissorEmail,
      recetorNome: f.recetorNome,
      recetorTelefone: f.recetorTelefone,
    }));
  }

  function handleRemoverDoLote(index: number): void {
    setLote((l) => l.filter((_, i) => i !== index));
  }

  async function handleEnviarTodas(): Promise<void> {
    if (!pwaUser) return;
    const itens = lote.length > 0 ? lote : [form];
    if (!itens[0]?.contentorId || !itens[0]?.emissorNome.trim() || !itens[0]?.recetorNome.trim() || !itens[0]?.nomeCarga.trim()) {
      toast.error('Adiciona pelo menos uma carga válida à lista.');
      return;
    }
    setEnviando(true);
    try {
      await enviarCargasPendentes(pwaUser.id, itens);
      toast.success(`${itens.length} carga${itens.length === 1 ? '' : 's'} enviada${itens.length === 1 ? '' : 's'}.`);
      fechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar cargas.');
    } finally {
      setEnviando(false);
    }
  }

  const detalhesPreenchidos = [
    form.emissorEmail,
    form.comprimentoCm,
    form.larguraCm,
    form.alturaCm,
    form.pesoKg,
    form.valor,
    form.notas,
  ].filter((v) => v !== null && v !== '').length + (form.pago ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-app">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-bg-header px-3 backdrop-blur-md">
        <button type="button" onClick={fechar} className="flex h-9 w-9 items-center justify-center rounded-control text-text-secondary">
          <X size={20} />
        </button>
        <span className="text-[15px] font-semibold text-text-primary">Nova Carga</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          <FloatingLabelInput as="select" label="Contentor de destino" value={form.contentorId} onChange={(e) => update('contentorId', e.target.value)}>
            {contentores.length === 0 ? <option value="">Nenhum contentor disponível</option> : null}
            {contentores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nome}
              </option>
            ))}
          </FloatingLabelInput>

          <FloatingLabelInput
            label="Nome do emissor"
            list="sugestoes-nomes"
            value={form.emissorNome}
            onChange={(e) => update('emissorNome', e.target.value)}
          />
          <datalist id="sugestoes-nomes">
            {sugestoes.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <FloatingLabelInput label="Telefone do emissor" value={form.emissorTelefone ?? ''} onChange={(e) => update('emissorTelefone', e.target.value || null)} />

          <FloatingLabelInput
            label="Nome do recetor"
            list="sugestoes-nomes"
            value={form.recetorNome}
            onChange={(e) => update('recetorNome', e.target.value)}
          />
          <FloatingLabelInput label="Telefone do recetor" value={form.recetorTelefone ?? ''} onChange={(e) => update('recetorTelefone', e.target.value || null)} />

          <FloatingLabelInput label="Nome da carga" value={form.nomeCarga} onChange={(e) => update('nomeCarga', e.target.value)} />

          <CollapsibleSection
            title="Mais detalhes"
            subtitle={detalhesPreenchidos > 0 ? `${detalhesPreenchidos} preenchido${detalhesPreenchidos === 1 ? '' : 's'}` : 'Email, dimensões, peso, valor, notas'}
          >
            <FloatingLabelInput label="Email do emissor" value={form.emissorEmail ?? ''} onChange={(e) => update('emissorEmail', e.target.value || null)} />

            <div className="grid grid-cols-2 gap-2">
              <FloatingLabelInput label="Comprimento (cm)" type="number" value={form.comprimentoCm ?? ''} onChange={(e) => update('comprimentoCm', numOrNull(e.target.value))} />
              <FloatingLabelInput label="Largura (cm)" type="number" value={form.larguraCm ?? ''} onChange={(e) => update('larguraCm', numOrNull(e.target.value))} />
              <FloatingLabelInput label="Altura (cm)" type="number" value={form.alturaCm ?? ''} onChange={(e) => update('alturaCm', numOrNull(e.target.value))} />
              <FloatingLabelInput label="Peso (kg)" type="number" value={form.pesoKg ?? ''} onChange={(e) => update('pesoKg', numOrNull(e.target.value))} />
            </div>
            <FloatingLabelInput label="Valor" type="number" value={form.valor ?? ''} onChange={(e) => update('valor', numOrNull(e.target.value))} />

            <Switch checked={form.pago} onChange={(v) => update('pago', v)} label="Pago" />

            <FloatingLabelInput as="textarea" label="Notas" value={form.notas ?? ''} onChange={(e) => update('notas', e.target.value || null)} />
          </CollapsibleSection>

          <button
            type="button"
            onClick={handleAdicionar}
            className="flex min-h-touch items-center justify-center gap-1.5 rounded-control border border-primary text-[15px] font-medium text-primary active:bg-primary-light"
          >
            <Plus size={18} /> Adicionar à lista
          </button>

          {lote.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">
                Por enviar ({lote.length})
              </h2>
              {lote.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-2 rounded-control border border-border bg-bg-surface p-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-text-primary">{item.nomeCarga}</p>
                    <p className="truncate text-[12px] text-text-tertiary">
                      {item.emissorNome} → {item.recetorNome}
                    </p>
                  </div>
                  <button type="button" onClick={() => handleRemoverDoLote(index)} className="shrink-0 p-2 text-error">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            disabled={enviando}
            onClick={() => void handleEnviarTodas()}
            className="mt-2 min-h-touch rounded-control bg-primary text-[16px] font-medium text-white active:bg-primary-hover disabled:opacity-60"
          >
            {enviando ? 'A enviar...' : `Enviar Todas${lote.length > 0 ? ` (${lote.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
