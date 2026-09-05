import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CaretDown as ChevronDown, Copy, CurrencyEur as Euro, IdentificationCard as IdCard, Stack as Layers, EnvelopeSimple as Mail, Package, PencilSimple as Pencil, Ruler, PaperPlaneTilt as Send, Note as StickyNote, Trash as Trash2, Scales as Weight, X } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { useTheme } from '@/hooks/useTheme';
import { estiloTema } from '@/lib/themeTokens';
import { CARGA_BG, CARGA_INK } from '@/lib/cargaVisual';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { PhoneField } from '@/components/ui/PhoneField';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { listContentoresDisponiveis } from '@/lib/data';
import { getContentorAtivo } from '@/lib/contentorAtivo';
import { guardarSugestaoNome, listarSugestoesNomes } from '@/lib/contactSuggestions';
import { PAISES_EMISSOR, PAISES_RECETOR } from '@/lib/paisesIndicativo';
import { CargaListHeader, CargaListRow, type AcaoLinhaCarga } from '@/components/CargaListRow';
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
  recetorEmail: '',
  nomeCarga: '',
  comprimentoCm: null,
  larguraCm: null,
  alturaCm: null,
  pesoKg: null,
  valor: null,
  pago: true,
  notas: '',
};

// Cor única para todas as linhas "Empilhadas" (ainda por enviar) — não é
// um agrupamento por contacto como na página Cargas, é um estado só: "na
// pilha, a aguardar envio".
const COR_EMPILHADA = 'var(--color-warning)';

function numOrNull(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
  // Controla a animação de entrada — arranca fechado (perto do botão "+"
  // na dock) e no frame seguinte transita suavemente para a posição final.
  const [entrada, setEntrada] = useState(false);
  const sugestoes = listarSugestoesNomes();

  useEffect(() => {
    if (!aberto) {
      setEntrada(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntrada(true));
    return () => cancelAnimationFrame(frame);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    listContentoresDisponiveis()
      .then((cs) => {
        setContentores(cs);
        const ativo = getContentorAtivo();
        const contentorPadrao = (ativo && cs.some((c) => c.id === ativo) ? ativo : cs[0]?.id) ?? '';
        setForm(prefill ?? { ...CAMPOS_VAZIOS, contentorId: contentorPadrao });
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
      recetorEmail: f.recetorEmail,
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
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 pb-[calc(env(safe-area-inset-bottom)+92px)] backdrop-blur-[2px] transition-opacity duration-300 ${
        entrada ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={fechar}
    >
      {/* Painel flutuante — não ocupa as bordas do ecrã; "cresce" a partir
          do botão "+" da dock (transform-origin em baixo) de forma suave.
          Material "liquid glass" (iOS mais recente): fundo translúcido +
          blur forte, mesma técnica já usada na Dock, em vez de um painel
          opaco — o conteúdo por trás continua a perceber-se ao de leve. */}
      <div
        data-theme={temaInvertido}
        style={{
          ...estiloTema(temaInvertido),
          backgroundColor: `${(estiloTema(temaInvertido) as Record<string, string>)['--bg-app']}e0`,
          maxHeight: 'calc(100% - 8px)',
          transformOrigin: 'bottom center',
        }}
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full max-w-[440px] flex-col overflow-hidden rounded-[28px] border border-white/15 shadow-2xl backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 ease-out ${
          entrada ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-6 scale-90 opacity-0'
        }`}
      >
      {/* Grabber — afordância de "sheet" ao estilo iOS, sinaliza que o
          painel pode ser arrastado/fechado, mesmo não sendo arrastável
          ainda (fecha-se pelo X ou a tocar fora). */}
      <div className="flex shrink-0 justify-center pb-1 pt-2">
        <span className="h-1 w-9 rounded-full bg-text-tertiary/40" />
      </div>
      <div
        style={{ backgroundColor: CARGA_BG, color: CARGA_INK }}
        className="flex h-12 shrink-0 items-center gap-2 px-3"
      >
        <button type="button" onClick={fechar} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control hover:bg-black/10">
          <X size={20} />
        </button>
        <span className="shrink-0 text-[15px] font-semibold">Nova Carga</span>
        <select
          value={form.contentorId}
          onChange={(e) => update('contentorId', e.target.value)}
          className="ml-auto min-w-0 max-w-[55%] truncate rounded-control border border-black/15 bg-white/70 px-2 py-1.5 text-[13px] text-text-primary"
        >
          {contentores.length === 0 ? <option value="">Sem contentores</option> : null}
          {contentores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5">
        <div className="flex flex-col gap-2.5">
          {/* Emissor — azul + seta a sair, em todo o sistema identifica quem envia */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
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
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors ${emissorExpandido ? 'border-primary bg-primary-light text-primary' : 'border-primary/25 bg-primary/5 text-primary'}`}
              >
                <ChevronDown size={18} className={`transition-transform ${emissorExpandido ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {emissorExpandido ? (
              <div className="ml-4 flex flex-col gap-1.5 border-l-2 border-primary/25 pl-3">
                <PhoneField label="Telefone do emissor" paises={PAISES_EMISSOR} corClass="text-primary" value={form.emissorTelefone} onChange={(v) => update('emissorTelefone', v)} />
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
            <div className="flex items-center gap-2">
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
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors ${recetorExpandido ? 'border-success bg-success/10 text-success' : 'border-success/25 bg-success/5 text-success'}`}
              >
                <ChevronDown size={18} className={`transition-transform ${recetorExpandido ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {recetorExpandido ? (
              <div className="ml-4 flex flex-col gap-1.5 border-l-2 border-success/25 pl-3">
                <PhoneField label="Telefone do recetor" paises={PAISES_RECETOR} corClass="text-success" value={form.recetorTelefone} onChange={(v) => update('recetorTelefone', v)} />
                <FloatingLabelInput
                  label="Email do recetor"
                  fieldSize="sm"
                  icon={Mail}
                  iconClassName="text-success/70"
                  value={form.recetorEmail ?? ''}
                  onChange={(e) => update('recetorEmail', e.target.value || null)}
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
                className="flex min-h-touch flex-1 items-center gap-2 rounded-control border border-dashed border-border/60 px-3 text-[13px] text-text-tertiary active:bg-bg-app"
              >
                <StickyNote size={14} /> Notas (opcional)
              </button>
            )}
            <div className="flex min-h-touch shrink-0 items-center gap-2 rounded-control border border-border/60 bg-bg-surface px-3">
              <span className="text-[13px] font-medium text-text-primary">Pago</span>
              <Switch checked={form.pago} onChange={(v) => update('pago', v)} />
            </div>
          </div>

          {notasExpandido ? (
            <FloatingLabelInput as="textarea" label="Notas" icon={StickyNote} value={form.notas ?? ''} onChange={(e) => update('notas', e.target.value || null)} />
          ) : null}
        </div>

        {lote.length > 0 ? (
          <div className="-mx-3.5 mt-4 border-t-2 border-dashed border-warning/30 bg-warning/[0.05] pb-1 pt-3">
            <h2 className="mb-1 flex items-center gap-1.5 px-4 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              <Layers size={13} /> Empilhadas ({lote.length})
            </h2>
            <CargaListHeader compacto />
            <div className="flex flex-col">
              {lote.map((item, index) => {
                const acoes: AcaoLinhaCarga[] = [
                  { label: 'Editar', icon: Pencil, onClick: () => handleEditarDoLote(index) },
                  { label: 'Duplicar', icon: Copy, onClick: () => handleDuplicarDoLote(index) },
                  { label: 'Eliminar', icon: Trash2, onClick: () => handleRemoverDoLote(index), destrutiva: true },
                ];
                return (
                  <CargaListRow
                    key={index}
                    corGrupo={COR_EMPILHADA}
                    acoes={acoes}
                    compacto
                    linha={{
                      id: `lote-${index}`,
                      codigo: `#${index + 1}`,
                      emissorNome: item.emissorNome,
                      recetorNome: item.recetorNome,
                      nomeCarga: item.nomeCarga,
                      comprimentoCm: item.comprimentoCm,
                      larguraCm: item.larguraCm,
                      alturaCm: item.alturaCm,
                      valor: item.valor,
                      estado: 'fila',
                      nota: null,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-2 border-t border-border/60 bg-bg-surface p-3">
        <button
          type="button"
          onClick={handleEmpilhar}
          className="flex min-h-touch flex-1 items-center justify-center gap-1.5 rounded-control border border-primary text-[14px] font-medium text-primary active:bg-primary-light"
        >
          <Layers size={16} /> Guardar e adicionar outra
        </button>
        <button
          type="button"
          disabled={enviando}
          onClick={() => void handleEnviar()}
          className="flex min-h-touch flex-1 items-center justify-center gap-1.5 rounded-control bg-primary text-[14px] font-medium text-white active:bg-primary-hover disabled:opacity-60"
        >
          {enviando ? 'A enviar...' : (
            <>
              <Send size={15} /> {`Enviar${lote.length > 0 ? ` (${lote.length})` : ''}`}
            </>
          )}
        </button>
      </div>
      </div>
    </div>
  );
}
