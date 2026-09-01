import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { Switch } from '@/components/ui/Switch';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { toast } from '@/components/ui/Toast';
import { listContentoresDisponiveis, listMinhasCargasPendentes, enviarCargasPendentes } from '@/lib/data';
import { guardarSugestaoNome, listarSugestoesNomes } from '@/lib/contactSuggestions';
import type { CargaPendente, ContentorDisponivel, EstadoCargaPendente, NovaCargaPendenteInput } from '@/types';

type SubAba = 'nova' | 'lista';

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

const ESTADO_LABEL: Record<EstadoCargaPendente, string> = { pendente: 'Pendente', importada: 'Importada', rejeitada: 'Rejeitada' };
const ESTADO_CLASS: Record<EstadoCargaPendente, string> = {
  pendente: 'bg-warning/10 text-warning',
  importada: 'bg-success/10 text-success',
  rejeitada: 'bg-error/10 text-error',
};

function numOrNull(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

interface NovaCargaTabProps {
  contentores: ContentorDisponivel[];
  prefill: NovaCargaPendenteInput | null;
  onEnviado: () => void;
}

function NovaCargaTab({ contentores, prefill, onEnviado }: NovaCargaTabProps): React.JSX.Element {
  const { pwaUser } = useAuth();
  const [form, setForm] = useState<NovaCargaPendenteInput>(() => ({
    ...CAMPOS_VAZIOS,
    contentorId: contentores[0]?.id ?? '',
  }));
  const [lote, setLote] = useState<NovaCargaPendenteInput[]>([]);
  const [enviando, setEnviando] = useState(false);
  const sugestoes = listarSugestoesNomes();

  useEffect(() => {
    if (prefill) setForm(prefill);
  }, [prefill]);

  useEffect(() => {
    setForm((f) => (f.contentorId ? f : { ...f, contentorId: contentores[0]?.id ?? '' }));
  }, [contentores]);

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
    // mantém contentor + emissor/recetor (doc 17 §6), limpa o resto
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
      setLote([]);
      setForm({ ...CAMPOS_VAZIOS, contentorId: form.contentorId });
      onEnviado();
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
    <div className="flex flex-col gap-3 p-4">
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
  );
}

interface ListaCargasTabProps {
  cargas: CargaPendente[];
  loading: boolean;
  contentores: ContentorDisponivel[];
  onReenviar: (prefill: NovaCargaPendenteInput) => void;
}

function ListaCargasTab({ cargas, loading, contentores, onReenviar }: ListaCargasTabProps): React.JSX.Element {
  const [filtro, setFiltro] = useState<EstadoCargaPendente | 'todas'>('todas');
  const filtradas = filtro === 'todas' ? cargas : cargas.filter((c) => c.estado === filtro);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex gap-2 overflow-x-auto">
        {(['todas', 'pendente', 'importada', 'rejeitada'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`min-h-touch shrink-0 rounded-pill px-4 text-[14px] font-medium ${
              filtro === f ? 'bg-primary text-white' : 'bg-bg-surface text-text-secondary'
            }`}
          >
            {f === 'todas' ? 'Todas' : ESTADO_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[14px] text-text-tertiary">A carregar...</p>
      ) : filtradas.length === 0 ? (
        <p className="text-[14px] text-text-tertiary">Nenhuma carga aqui.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtradas.map((c) => {
            const contentor = contentores.find((ct) => ct.id === c.contentorId);
            return (
              <div key={c.id} className="rounded-control border border-border bg-bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-medium text-text-primary">{c.nomeCarga}</span>
                  <span className={`shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-medium ${ESTADO_CLASS[c.estado]}`}>
                    {ESTADO_LABEL[c.estado]}
                  </span>
                </div>
                <p className="text-[13px] text-text-tertiary">
                  {contentor?.codigo ?? '—'} · {c.emissorNome} → {c.recetorNome}
                </p>
                {c.estado === 'rejeitada' ? (
                  <>
                    {c.motivoRejeicao ? <p className="mt-1 text-[13px] text-error">Motivo: {c.motivoRejeicao}</p> : null}
                    <button
                      type="button"
                      onClick={() =>
                        onReenviar({
                          contentorId: c.contentorId,
                          emissorNome: c.emissorNome,
                          emissorTelefone: c.emissorTelefone,
                          emissorEmail: c.emissorEmail,
                          recetorNome: c.recetorNome,
                          recetorTelefone: c.recetorTelefone,
                          nomeCarga: c.nomeCarga,
                          comprimentoCm: c.comprimentoCm,
                          larguraCm: c.larguraCm,
                          alturaCm: c.alturaCm,
                          pesoKg: c.pesoKg,
                          valor: c.valor,
                          pago: c.pago,
                          notas: c.notas,
                        })
                      }
                      className="mt-2 min-h-touch w-fit rounded-control border border-primary px-3 text-[13px] font-medium text-primary active:bg-primary-light"
                    >
                      Reenviar corrigida
                    </button>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CargasPage(): React.JSX.Element {
  const [subAba, setSubAba] = useState<SubAba>('nova');
  const [contentores, setContentores] = useState<ContentorDisponivel[]>([]);
  const [cargas, setCargas] = useState<CargaPendente[]>([]);
  const [loadingCargas, setLoadingCargas] = useState(true);
  const [prefill, setPrefill] = useState<NovaCargaPendenteInput | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    listContentoresDisponiveis()
      .then(setContentores)
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Falha ao carregar contentores.'));
  }, []);

  useEffect(() => {
    setLoadingCargas(true);
    listMinhasCargasPendentes()
      .then(setCargas)
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Falha ao carregar cargas.'))
      .finally(() => setLoadingCargas(false));
  }, [refreshKey]);

  function handleReenviar(dados: NovaCargaPendenteInput): void {
    setPrefill(dados);
    setSubAba('nova');
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-border bg-bg-surface p-3">
        <div className="flex items-center gap-0.5 rounded-control bg-bg-input p-0.5">
          <button
            type="button"
            onClick={() => setSubAba('nova')}
            className={`min-h-touch flex-1 rounded-[6px] text-[14px] font-medium transition-colors ${
              subAba === 'nova' ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary'
            }`}
          >
            Nova Carga
          </button>
          <button
            type="button"
            onClick={() => setSubAba('lista')}
            className={`min-h-touch flex-1 rounded-[6px] text-[14px] font-medium transition-colors ${
              subAba === 'lista' ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary'
            }`}
          >
            Lista de Cargas
          </button>
        </div>
      </div>

      {subAba === 'nova' ? (
        <NovaCargaTab contentores={contentores} prefill={prefill} onEnviado={() => setRefreshKey((k) => k + 1)} />
      ) : (
        <ListaCargasTab cargas={cargas} loading={loadingCargas} contentores={contentores} onReenviar={handleReenviar} />
      )}
    </div>
  );
}
