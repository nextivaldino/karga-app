import { useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Copy, Euro, IdCard, Mail, MoreVertical, Package, Pencil, Phone, Plus, Ruler, StickyNote, Trash2, Weight, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { useTheme } from '@/hooks/useTheme';
import { estiloTema } from '@/lib/themeTokens';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { listContentoresDisponiveis } from '@/lib/data';
import { guardarSugestaoNome, listarSugestoesNomes } from '@/lib/contactSuggestions';
import type { ContentorDisponivel, NovaCargaPendenteInput } from '@/types';

// Pago ativo por defeito (doc 19 §5) — no contexto de campo, assume-se
// pagamento já combinado, ao contrário do Desktop (Devido por defeito).
const CAMPOS_VAZIOS: NovaCargaPendenteInput = {
  contentorId: '',
  emissorNome: '',
  emissorTelefone: '',
  emissorEmail: '',
  emissorNif: '',
  recetorNome: '',
  recetorTelefone: '',
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

function formatValorChip(v: number | null): string {
  return v != null ? `${v} €` : '—';
}

interface LinhaEmpilhadaProps {
  item: NovaCargaPendenteInput;
  onEditar: () => void;
  onDuplicar: () => void;
  onEliminar: () => void;
}

// Linha em texto+ícones (não cartão) — mais parecido com uma linha de
// tabela/recibo; o "..." abre as ações em vez de um ícone fixo de remover.
function LinhaEmpilhada({ item, onEditar, onDuplicar, onEliminar }: LinhaEmpilhadaProps): React.JSX.Element {
  const [menuAberto, setMenuAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuAberto(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2 py-2.5">
      <Package size={16} className="shrink-0 text-text-tertiary" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[13px] font-medium text-text-primary">{item.nomeCarga}</p>
          <span className="shrink-0 text-[12px] tabular-nums text-text-secondary">{formatValorChip(item.valor)}</span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-text-tertiary">
          <ArrowUpRight size={13} className="shrink-0 text-primary" />
          <span className="max-w-[36%] truncate">{item.emissorNome}</span>
          <ArrowDownLeft size={13} className="ml-1 shrink-0 text-success" />
          <span className="max-w-[36%] truncate">{item.recetorNome}</span>
        </p>
      </div>
      <div ref={ref} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuAberto((v) => !v)}
          title="Opções"
          className="flex h-8 w-8 items-center justify-center rounded-control text-text-tertiary active:bg-bg-app"
        >
          <MoreVertical size={17} />
        </button>
        {menuAberto ? (
          <div className="absolute right-0 top-9 z-10 w-36 overflow-hidden rounded-control border border-border bg-bg-surface shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMenuAberto(false);
                onEditar();
              }}
              className="flex min-h-touch w-full items-center gap-2 px-3 text-left text-[13px] text-text-primary active:bg-bg-app"
            >
              <Pencil size={14} className="text-text-secondary" /> Editar
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuAberto(false);
                onDuplicar();
              }}
              className="flex min-h-touch w-full items-center gap-2 border-t border-border px-3 text-left text-[13px] text-text-primary active:bg-bg-app"
            >
              <Copy size={14} className="text-text-secondary" /> Duplicar
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuAberto(false);
                onEliminar();
              }}
              className="flex min-h-touch w-full items-center gap-2 border-t border-border px-3 text-left text-[13px] text-error active:bg-error/10"
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function NovaCargaOverlay(): React.JSX.Element | null {
  const { aberto, prefill, fechar } = useNovaCargaOverlay();
  const { pwaUser } = useAuth();
  const { enviarOuEnfileirar } = useFilaOffline();
  // O popup e os seus menus usam sempre o tema oposto ao da app — cria
  // contraste deliberado (destaque de "primeiro plano") independente da
  // escolha de tema do utilizador.
  const { theme } = useTheme();
  const temaInvertido = theme === 'dark' ? 'light' : 'dark';
  const [contentores, setContentores] = useState<ContentorDisponivel[]>([]);
  const [form, setForm] = useState<NovaCargaPendenteInput>(CAMPOS_VAZIOS);
  const [lote, setLote] = useState<NovaCargaPendenteInput[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [emissorExpandido, setEmissorExpandido] = useState(false);
  const [recetorExpandido, setRecetorExpandido] = useState(false);
  const [notasExpandido, setNotasExpandido] = useState(false);
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
    setEmissorExpandido(false);
    setRecetorExpandido(false);
    setNotasExpandido(Boolean(prefill?.notas));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  if (!aberto) return null;

  function update<K extends keyof NovaCargaPendenteInput>(key: K, value: NovaCargaPendenteInput[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleEmpilhar(): void {
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
      emissorNif: f.emissorNif,
      recetorNome: f.recetorNome,
      recetorTelefone: f.recetorTelefone,
    }));
  }

  function handleRemoverDoLote(index: number): void {
    setLote((l) => l.filter((_, i) => i !== index));
  }

  function handleEditarDoLote(index: number): void {
    const item = lote[index];
    if (!item) return;
    setForm(item);
    setNotasExpandido(Boolean(item.notas));
    setLote((l) => l.filter((_, i) => i !== index));
  }

  function handleDuplicarDoLote(index: number): void {
    setLote((l) => {
      const item = l[index];
      if (!item) return l;
      return [...l.slice(0, index + 1), item, ...l.slice(index + 1)];
    });
  }

  async function handleEnviar(): Promise<void> {
    if (!pwaUser) return;
    const itens = lote.length > 0 ? lote : [form];
    if (!itens[0]?.contentorId || !itens[0]?.emissorNome.trim() || !itens[0]?.recetorNome.trim() || !itens[0]?.nomeCarga.trim()) {
      toast.error('Preenche pelo menos uma carga válida.');
      return;
    }
    setEnviando(true);
    try {
      const resultado = await enviarOuEnfileirar(itens);
      if (resultado === 'enviado') {
        toast.success(`${itens.length} carga${itens.length === 1 ? '' : 's'} enviada${itens.length === 1 ? '' : 's'}.`);
      } else {
        toast.info(`${itens.length} carga${itens.length === 1 ? '' : 's'} guardada${itens.length === 1 ? '' : 's'} — vai${itens.length === 1 ? '' : 'ão'} enviar quando voltares a ficar online.`);
      }
      fechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao guardar as cargas.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div data-theme={temaInvertido} style={estiloTema(temaInvertido)} className="fixed inset-0 z-50 flex flex-col bg-bg-app">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-bg-header px-3 backdrop-blur-md">
        <button type="button" onClick={fechar} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-text-secondary">
          <X size={20} />
        </button>
        <span className="shrink-0 text-[15px] font-semibold text-text-primary">Nova Carga</span>
        <select
          value={form.contentorId}
          onChange={(e) => update('contentorId', e.target.value)}
          className="ml-auto min-w-0 max-w-[55%] truncate rounded-control border border-border bg-bg-input px-2 py-1.5 text-[13px] text-text-primary"
        >
          {contentores.length === 0 ? <option value="">Sem contentores</option> : null}
          {contentores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          {/* Emissor — azul + seta a sair, em todo o sistema identifica quem envia */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FloatingLabelInput
                  label="Emissor"
                  list="sugestoes-nomes"
                  icon={ArrowUpRight}
                  iconClassName="text-primary"
                  value={form.emissorNome}
                  onChange={(e) => update('emissorNome', e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setEmissorExpandido((v) => !v)}
                title="Mais campos do emissor"
                className={`flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-control border ${emissorExpandido ? 'border-primary bg-primary-light text-primary' : 'border-primary/25 bg-primary/5 text-primary'}`}
              >
                <ChevronDown size={18} className={`transition-transform ${emissorExpandido ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {emissorExpandido ? (
              <div className="ml-4 flex flex-col gap-1.5 border-l-2 border-primary/25 pl-3">
                <FloatingLabelInput
                  label="Telefone do emissor"
                  fieldSize="sm"
                  icon={Phone}
                  iconClassName="text-primary/70"
                  value={form.emissorTelefone ?? ''}
                  onChange={(e) => update('emissorTelefone', e.target.value || null)}
                />
                <FloatingLabelInput
                  label="Email do emissor"
                  fieldSize="sm"
                  icon={Mail}
                  iconClassName="text-primary/70"
                  value={form.emissorEmail ?? ''}
                  onChange={(e) => update('emissorEmail', e.target.value || null)}
                />
                <FloatingLabelInput
                  label="NIF (Luxemburgo)"
                  fieldSize="sm"
                  icon={IdCard}
                  iconClassName="text-primary/70"
                  inputMode="numeric"
                  maxLength={13}
                  value={form.emissorNif ?? ''}
                  onChange={(e) => update('emissorNif', e.target.value.replace(/[^0-9]/g, '') || null)}
                />
              </div>
            ) : null}
          </div>

          <datalist id="sugestoes-nomes">
            {sugestoes.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>

          {/* Separador fluido entre Emissor e Recetor — a cor faz a transição azul → verde */}
          <div className="h-px bg-gradient-to-r from-primary/40 via-border to-success/40" />

          {/* Recetor — verde + seta a entrar, em todo o sistema identifica quem recebe */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FloatingLabelInput
                  label="Recetor"
                  list="sugestoes-nomes"
                  icon={ArrowDownLeft}
                  iconClassName="text-success"
                  value={form.recetorNome}
                  onChange={(e) => update('recetorNome', e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setRecetorExpandido((v) => !v)}
                title="Mais campos do recetor"
                className={`flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-control border ${recetorExpandido ? 'border-success bg-success/10 text-success' : 'border-success/25 bg-success/5 text-success'}`}
              >
                <ChevronDown size={18} className={`transition-transform ${recetorExpandido ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {recetorExpandido ? (
              <div className="ml-4 flex flex-col gap-1.5 border-l-2 border-success/25 pl-3">
                <FloatingLabelInput
                  label="Telefone do recetor"
                  fieldSize="sm"
                  icon={Phone}
                  iconClassName="text-success/70"
                  value={form.recetorTelefone ?? ''}
                  onChange={(e) => update('recetorTelefone', e.target.value || null)}
                />
              </div>
            ) : null}
          </div>

          <div className="h-px bg-border" />

          <FloatingLabelInput label="Nome da carga" icon={Package} value={form.nomeCarga} onChange={(e) => update('nomeCarga', e.target.value)} />

          <div className="grid grid-cols-3 gap-2">
            <FloatingLabelInput label="C (cm)" icon={Ruler} type="number" value={form.comprimentoCm ?? ''} onChange={(e) => update('comprimentoCm', numOrNull(e.target.value))} />
            <FloatingLabelInput label="L (cm)" icon={Ruler} type="number" value={form.larguraCm ?? ''} onChange={(e) => update('larguraCm', numOrNull(e.target.value))} />
            <FloatingLabelInput label="A (cm)" icon={Ruler} type="number" value={form.alturaCm ?? ''} onChange={(e) => update('alturaCm', numOrNull(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FloatingLabelInput label="Peso (kg)" icon={Weight} type="number" value={form.pesoKg ?? ''} onChange={(e) => update('pesoKg', numOrNull(e.target.value))} />
            <FloatingLabelInput label="Valor" icon={Euro} type="number" value={form.valor ?? ''} onChange={(e) => update('valor', numOrNull(e.target.value))} />
          </div>

          {/* Pago fica no fim do formulário, na mesma linha do gatilho de Notas */}
          <div className="flex items-center gap-2">
            {notasExpandido ? null : (
              <button
                type="button"
                onClick={() => setNotasExpandido(true)}
                className="flex min-h-touch flex-1 items-center gap-2 rounded-control border border-dashed border-border px-3 text-[13px] text-text-tertiary active:bg-bg-app"
              >
                <StickyNote size={14} /> Notas (opcional)
              </button>
            )}
            <div className="flex min-h-touch shrink-0 items-center gap-2 rounded-control border border-border bg-bg-surface px-3">
              <span className="text-[13px] font-medium text-text-primary">Pago</span>
              <Switch checked={form.pago} onChange={(v) => update('pago', v)} />
            </div>
          </div>

          {notasExpandido ? (
            <FloatingLabelInput as="textarea" label="Notas" icon={StickyNote} value={form.notas ?? ''} onChange={(e) => update('notas', e.target.value || null)} />
          ) : null}
        </div>

        {lote.length > 0 ? (
          <div className="-mx-4 mt-4 border-t-2 border-dashed border-warning/30 bg-warning/[0.05] px-4 pb-1 pt-3">
            <h2 className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              <Package size={13} /> Empilhadas ({lote.length})
            </h2>
            <div className="flex flex-col divide-y divide-border/60">
              {lote.map((item, index) => (
                <LinhaEmpilhada
                  key={index}
                  item={item}
                  onEditar={() => handleEditarDoLote(index)}
                  onDuplicar={() => handleDuplicarDoLote(index)}
                  onEliminar={() => handleRemoverDoLote(index)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-2 border-t border-border bg-bg-surface p-3">
        <button
          type="button"
          onClick={handleEmpilhar}
          className="flex min-h-touch flex-1 items-center justify-center gap-1.5 rounded-control border border-primary text-[14px] font-medium text-primary active:bg-primary-light"
        >
          <Plus size={16} /> Empilhar mais uma
        </button>
        <button
          type="button"
          disabled={enviando}
          onClick={() => void handleEnviar()}
          className="flex min-h-touch flex-1 items-center justify-center rounded-control bg-primary text-[14px] font-medium text-white active:bg-primary-hover disabled:opacity-60"
        >
          {enviando ? 'A enviar...' : `Enviar${lote.length > 0 ? ` (${lote.length})` : ''}`}
        </button>
      </div>
    </div>
  );
}
