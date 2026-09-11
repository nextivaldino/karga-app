import { useState } from 'react';
import { CaretDown as ChevronDown } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { useContentorAtivo } from '@/hooks/useContentorAtivo';
import { useCargasHub } from '@/hooks/useCargasHub';
import { useHubSheet } from '@/hooks/useHubSheet';
import { toast } from '@/components/ui/Toast';
import { guardarSugestaoCarga, guardarSugestaoNome, listarSugestoesCargas, listarSugestoesNomes } from '@/lib/contactSuggestions';
import type { NovaCargaPendenteInput } from '@/types';

const CAMPOS_VAZIOS: NovaCargaPendenteInput = {
  contentorId: '',
  emissorNome: '',
  emissorTelefone: '',
  emissorEmail: '',
  emissorNif: '',
  emissorMorada: '',
  recetorNome: '',
  recetorTelefone: '',
  recetorEmail: '',
  recetorMorada: '',
  nomeCarga: '',
  comprimentoCm: null,
  larguraCm: null,
  alturaCm: null,
  pesoKg: null,
  valor: null,
  pago: true,
  notas: '',
};

function numOrNull(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const CAMPO = 'w-full rounded-xl border border-border bg-glass px-3 py-[11px] text-[14px] text-text-primary outline-none focus:border-primary';
const LABEL = 'mb-[5px] block text-[11.5px] text-text-tertiary';

function GrupoParte({
  titulo,
  nome,
  onNome,
  telefone,
  onTelefone,
  email,
  onEmail,
  morada,
  onMorada,
  nif,
  onNif,
  nomePlaceholder,
  sugestoesId,
}: {
  titulo: string;
  nome: string;
  onNome: (v: string) => void;
  telefone: string | null;
  onTelefone: (v: string | null) => void;
  email: string | null;
  onEmail: (v: string | null) => void;
  morada: string | null;
  onMorada: (v: string | null) => void;
  nif?: string | null;
  onNif?: (v: string | null) => void;
  nomePlaceholder: string;
  sugestoesId: string;
}): React.JSX.Element {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="mb-3 rounded-2xl border border-border bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12.5px] font-bold text-text-primary">{titulo}</span>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="flex items-center gap-[3px] text-[11.5px] font-medium"
          style={{ color: 'var(--copper-strong)' }}
        >
          Mais campos
          <ChevronDown size={12} className={`transition-transform ${aberto ? 'rotate-90' : ''}`} />
        </button>
      </div>
      <input value={nome} onChange={(e) => onNome(e.target.value)} placeholder={nomePlaceholder} list={sugestoesId} className={CAMPO} />
      {aberto ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input value={telefone ?? ''} onChange={(e) => onTelefone(e.target.value || null)} placeholder="Telefone" className={CAMPO} />
          <input value={email ?? ''} onChange={(e) => onEmail(e.target.value || null)} placeholder="Email" className={CAMPO} />
          {onNif ? (
            <input value={nif ?? ''} onChange={(e) => onNif(e.target.value || null)} placeholder="NIF" className={CAMPO} />
          ) : null}
          <input
            value={morada ?? ''}
            onChange={(e) => onMorada(e.target.value || null)}
            placeholder="Morada"
            className={`${CAMPO} ${onNif ? '' : 'col-span-2'}`}
          />
        </div>
      ) : null}
    </div>
  );
}

// Formulário "Adicionar carga" (docs/26 §7) — mesmos campos/schema já
// existentes (NovaCargaPendenteInput/enviarCargasPendentes em
// lib/data.ts), com divulgação progressiva ("Mais campos") e
// empilhamento de múltiplas cargas antes de enviar (§7.3), reaproveitando
// a mesma lógica que já existia no formulário anterior desta sessão.
//
// Três pontos do mockup ficam deliberadamente omitidos/simplificados
// porque o schema real não os suporta e o pedido foi para não inventar
// schema novo: (1) código manual — cargas_pendentes não tem campo de
// código, é atribuído só depois de importado no Desktop; (2) múltiplos
// recetores — NovaCargaPendenteInput só tem um recetor; (3) chips de
// Estado (Pendente/Trânsito/Entregue) — todas as cargas do PWA nascem
// "pendente" por definição, o estado de trânsito só existe depois de
// importadas.
export function AddCargaSheetContent({ prefillInicial }: { prefillInicial?: NovaCargaPendenteInput }): React.JSX.Element {
  const { pwaUser } = useAuth();
  const { enviarOuEnfileirar } = useFilaOffline();
  const { contentores, contentorAtivoId } = useContentorAtivo();
  const { bumpRefresh } = useCargasHub();
  const { fechar } = useHubSheet();

  const [form, setForm] = useState<NovaCargaPendenteInput>(
    prefillInicial ?? { ...CAMPOS_VAZIOS, contentorId: contentorAtivoId ?? '' },
  );
  const [lote, setLote] = useState<NovaCargaPendenteInput[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const sugestoesNomes = listarSugestoesNomes();
  const sugestoesCargas = listarSugestoesCargas();

  function update<K extends keyof NovaCargaPendenteInput>(key: K, value: NovaCargaPendenteInput[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const m3 =
    form.comprimentoCm != null && form.alturaCm != null && form.larguraCm != null
      ? (form.comprimentoCm * form.alturaCm * form.larguraCm) / 1_000_000
      : 0;

  function handleAdicionarLista(): void {
    setTentouEnviar(true);
    if (!form.contentorId || !form.emissorNome.trim() || !form.recetorNome.trim() || !form.nomeCarga.trim()) {
      toast.error('Contentor, emissor, recetor e nome da carga são obrigatórios.');
      return;
    }
    setTentouEnviar(false);
    guardarSugestaoNome(form.emissorNome);
    guardarSugestaoNome(form.recetorNome);
    guardarSugestaoCarga(form.nomeCarga);
    setLote((l) => [...l, form]);
    setForm((f) => ({
      ...CAMPOS_VAZIOS,
      contentorId: f.contentorId,
      emissorNome: f.emissorNome,
      emissorTelefone: f.emissorTelefone,
      emissorEmail: f.emissorEmail,
      emissorNif: f.emissorNif,
      emissorMorada: f.emissorMorada,
    }));
  }

  async function handleGuardar(): Promise<void> {
    if (!pwaUser) return;
    setTentouEnviar(true);
    const itens = [...lote];
    const formPreenchido = form.contentorId && form.emissorNome.trim() && form.recetorNome.trim() && form.nomeCarga.trim();
    if (formPreenchido) itens.push(form);
    if (itens.length === 0) {
      toast.error('Preenche pelo menos uma carga válida.');
      return;
    }
    for (const item of itens) {
      guardarSugestaoNome(item.emissorNome);
      guardarSugestaoNome(item.recetorNome);
      guardarSugestaoCarga(item.nomeCarga);
    }
    setEnviando(true);
    try {
      const resultado = await enviarOuEnfileirar(itens);
      if (resultado === 'enviado') toast.success(`${itens.length} carga${itens.length === 1 ? '' : 's'} enviada${itens.length === 1 ? '' : 's'}.`);
      else if (resultado === 'offline') toast.info('Guardado — vai enviar quando voltares a ficar online.');
      else toast.warning('Guardado na fila (servidor indisponível).');
      bumpRefresh();
      fechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao guardar as cargas.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div className="mb-3">
        <p className={LABEL}>Código</p>
        <p className="rounded-xl border border-border bg-glass px-3 py-[11px] text-[13px] text-text-tertiary">
          Atribuído automaticamente após importação no Desktop
        </p>
      </div>

      <div className="mb-3">
        <label className={LABEL}>Contentor de destino</label>
        <select
          value={form.contentorId}
          onChange={(e) => update('contentorId', e.target.value)}
          className={`${CAMPO} appearance-none ${tentouEnviar && !form.contentorId ? 'border-error' : ''}`}
        >
          <option value="">Escolher…</option>
          {contentores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} · {c.nome}
            </option>
          ))}
        </select>
      </div>

      <datalist id="sugestoes-nomes-hub">
        {sugestoesNomes.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <GrupoParte
        titulo="Emissor"
        nome={form.emissorNome}
        onNome={(v) => update('emissorNome', v)}
        telefone={form.emissorTelefone}
        onTelefone={(v) => update('emissorTelefone', v)}
        email={form.emissorEmail}
        onEmail={(v) => update('emissorEmail', v)}
        morada={form.emissorMorada}
        onMorada={(v) => update('emissorMorada', v)}
        nif={form.emissorNif}
        onNif={(v) => update('emissorNif', v)}
        nomePlaceholder="Nome do emissor"
        sugestoesId="sugestoes-nomes-hub"
      />

      <GrupoParte
        titulo="Recetor"
        nome={form.recetorNome}
        onNome={(v) => update('recetorNome', v)}
        telefone={form.recetorTelefone}
        onTelefone={(v) => update('recetorTelefone', v)}
        email={form.recetorEmail}
        onEmail={(v) => update('recetorEmail', v)}
        morada={form.recetorMorada}
        onMorada={(v) => update('recetorMorada', v)}
        nomePlaceholder="Nome do recetor"
        sugestoesId="sugestoes-nomes-hub"
      />

      <div className="mb-3">
        <label className={LABEL}>Nome da carga</label>
        <input value={form.nomeCarga} onChange={(e) => update('nomeCarga', e.target.value)} placeholder="Ex: Eletrodomésticos, roupa..." list="sugestoes-cargas-hub" className={CAMPO} />
        <datalist id="sugestoes-cargas-hub">
          {sugestoesCargas.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <div className="mb-3">
        <label className={LABEL}>Dimensões (cm)</label>
        <div className="grid grid-cols-3 gap-2">
          <input inputMode="numeric" placeholder="C" value={form.comprimentoCm ?? ''} onChange={(e) => update('comprimentoCm', numOrNull(e.target.value))} className={CAMPO} />
          <input inputMode="numeric" placeholder="A" value={form.alturaCm ?? ''} onChange={(e) => update('alturaCm', numOrNull(e.target.value))} className={CAMPO} />
          <input inputMode="numeric" placeholder="L" value={form.larguraCm ?? ''} onChange={(e) => update('larguraCm', numOrNull(e.target.value))} className={CAMPO} />
        </div>
        <p className="mt-1 text-right text-[11px] text-text-tertiary">
          Volume: <b style={{ color: 'var(--copper-strong)' }}>{m3.toFixed(2)} m³</b>
        </p>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className={LABEL}>Peso (kg)</label>
          <input inputMode="numeric" placeholder="0" value={form.pesoKg ?? ''} onChange={(e) => update('pesoKg', numOrNull(e.target.value))} className={CAMPO} />
        </div>
        <div>
          <label className={LABEL}>Valor</label>
          <input inputMode="decimal" placeholder="0,00 €" value={form.valor ?? ''} onChange={(e) => update('valor', numOrNull(e.target.value))} className={CAMPO} />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <label className="text-[13px] text-text-secondary">Faturação</label>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-text-secondary">{form.pago ? 'Pago' : 'Devido'}</span>
          <button
            type="button"
            onClick={() => update('pago', !form.pago)}
            className="relative h-[22px] w-[38px] shrink-0 rounded-xl border transition-colors"
            style={{
              background: form.pago ? 'rgba(200,147,97,0.28)' : 'var(--glass-strong)',
              borderColor: form.pago ? 'var(--copper)' : 'var(--border-strong)',
            }}
          >
            <span
              className="absolute top-[2px] h-[16px] w-[16px] rounded-full transition-transform"
              style={{ left: 2, transform: form.pago ? 'translateX(16px)' : 'translateX(0)', background: form.pago ? 'var(--copper-strong)' : 'var(--text-secondary)' }}
            />
          </button>
        </div>
      </div>

      {lote.length > 0 ? (
        <div className="mb-3 mt-1">
          {lote.map((item, i) => (
            <div key={i} className="mb-1.5 flex items-center gap-2 rounded-[11px] border border-border bg-glass px-2.5 py-2 text-[12px] text-text-secondary">
              <span className="flex-1 font-semibold text-text-primary">{item.emissorNome} — {item.nomeCarga || 'nova carga'}</span>
              <button type="button" onClick={() => setLote((l) => l.filter((_, idx) => idx !== i))} className="px-1 text-[14px] text-text-tertiary">
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-2 px-0.5 text-[11.5px] text-text-tertiary">Nenhuma carga na lista ainda — preenche e adiciona quantas precisares antes de enviar.</p>
      )}
      <button
        type="button"
        onClick={handleAdicionarLista}
        className="mb-3.5 w-full rounded-xl border border-dashed border-border-strong py-[11px] text-[13px] font-semibold text-text-primary"
      >
        + Adicionar à lista
      </button>

      <button
        type="button"
        disabled={enviando}
        onClick={() => void handleGuardar()}
        className="w-full rounded-2xl py-3.5 text-[14.5px] font-bold disabled:opacity-60"
        style={{ background: 'linear-gradient(150deg, var(--copper-strong), var(--copper))', color: '#241609' }}
      >
        {enviando ? 'A enviar...' : lote.length > 0 ? `Enviar todas (${lote.length + 1})` : 'Guardar carga'}
      </button>
    </div>
  );
}
