import { useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CaretDown as ChevronDown, CaretUp as ChevronUp, Copy, CurrencyEur as Euro, IdentificationCard as IdCard, Stack as Layers, EnvelopeSimple as Mail, MapPin, Minus, Package, PencilSimple as Pencil, PaperPlaneTilt as Send, Note as StickyNote, Trash as Trash2, X } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { useContentorAtivo } from '@/hooks/useContentorAtivo';
import { useCargasToolbar } from '@/hooks/useCargasToolbar';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { PhoneField } from '@/components/ui/PhoneField';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { ContentorPickerSheet } from '@/components/ContentorPickerSheet';
import { guardarSugestaoCarga, guardarSugestaoNome, listarSugestoesCargas, listarSugestoesNomes } from '@/lib/contactSuggestions';
import { PAISES_EMISSOR, PAISES_RECETOR } from '@/lib/paisesIndicativo';
import { CargaListHeader, CargaListRow, type AcaoLinhaCarga } from '@/components/CargaListRow';
import type { NovaCargaPendenteInput } from '@/types';

// Pago ativo por defeito (doc 19 §5) — no contexto de campo, assume-se
// pagamento já combinado, ao contrário do Desktop (Devido por defeito).
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


// Distância mínima puxada no grabber do topo para minimizar (mesmo estilo
// de gesto do PullToRefresh, mas aqui é um limiar único, sem resistência
// elástica — arrastar o suficiente já minimiza).
const LIMIAR_MINIMIZAR_PX = 60;

function numOrNull(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function NovaCargaOverlay(): React.JSX.Element | null {
  const { estado, prefill, aberturaId, fechar, minimizar, restaurar } = useNovaCargaOverlay();
  const { pwaUser } = useAuth();
  const { enviarOuEnfileirar } = useFilaOffline();
  const { contentores, contentorAtivoId, selecionarContentor } = useContentorAtivo();
  const { bumpRefresh } = useCargasToolbar();
  const [seletorContentorAberto, setSeletorContentorAberto] = useState(false);
  const [form, setForm] = useState<NovaCargaPendenteInput>(CAMPOS_VAZIOS);
  const [lote, setLote] = useState<NovaCargaPendenteInput[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [emissorExpandido, setEmissorExpandido] = useState(false);
  const [recetorExpandido, setRecetorExpandido] = useState(false);
  const [notasExpandido, setNotasExpandido] = useState(false);
  // Controla a animação de entrada/saída da folha (fade + deslizar) —
  // arranca fechada e no frame seguinte transita para a posição final;
  // corre outra vez sempre que se volta de 'minimizado' para 'aberto'.
  const [entrada, setEntrada] = useState(false);
  // Só passa a mostrar os campos obrigatórios em falta a vermelho depois
  // de uma primeira tentativa falhada — nunca logo de início, um
  // formulário vazio não é um "erro".
  const [tentouEnviar, setTentouEnviar] = useState(false);
  // "Código único para este emissor" (doc do Desktop) — aqui é só uma
  // referência local dentro da lista Empilhadas desta sessão (ex: todas
  // "#1"), nunca um código real: a carga pendente do PWA não tem esse
  // campo, o código a sério só é atribuído pelo admin ao importar.
  const [codigoUnicoEmissor, setCodigoUnicoEmissor] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const sugestoes = listarSugestoesNomes();
  const sugestoesCargas = listarSugestoesCargas();

  useEffect(() => {
    if (estado !== 'aberto') {
      setEntrada(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntrada(true));
    return () => cancelAnimationFrame(frame);
  }, [estado]);

  // Só reinicia o formulário numa abertura a sério (abrir()) — nunca ao
  // minimizar()/restaurar(), que devem preservar o que já estava escrito.
  useEffect(() => {
    if (aberturaId === 0) return;
    setForm(prefill ?? { ...CAMPOS_VAZIOS, contentorId: contentorAtivoId ?? '' });
    setLote([]);
    setEmissorExpandido(false);
    setRecetorExpandido(false);
    setNotasExpandido(Boolean(prefill?.notas));
    setTentouEnviar(false);
    setCodigoUnicoEmissor(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberturaId]);

  if (estado === 'fechado') return null;

  function update<K extends keyof NovaCargaPendenteInput>(key: K, value: NovaCargaPendenteInput[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const contentorAtual = contentores.find((c) => c.id === form.contentorId) ?? null;

  // Pré-visualização de m³ ao vivo — mesma conta do Desktop.
  const m3Preview =
    form.comprimentoCm != null && form.larguraCm != null && form.alturaCm != null
      ? (form.comprimentoCm * form.larguraCm * form.alturaCm) / 1_000_000
      : null;

  // Referências partilhadas por emissor dentro da lista Empilhadas —
  // primeira carga de um emissor novo ganha o próximo número, as
  // seguintes do mesmo emissor reutilizam-no.
  function referenciasPorEmissor(): Map<string, number> {
    const mapa = new Map<string, number>();
    let proximo = 1;
    for (const item of lote) {
      const chave = item.emissorNome.trim().toLowerCase();
      if (!mapa.has(chave)) {
        mapa.set(chave, proximo);
        proximo++;
      }
    }
    return mapa;
  }
  const referencias = codigoUnicoEmissor ? referenciasPorEmissor() : null;

  function handleEmpilhar(): void {
    setTentouEnviar(true);
    if (!form.contentorId) {
      toast.error('Escolhe um contentor de destino.');
      return;
    }
    if (!form.emissorNome.trim() || !form.recetorNome.trim() || !form.nomeCarga.trim()) {
      toast.error('Emissor, recetor e nome da carga são obrigatórios.');
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
      recetorNome: f.recetorNome,
      recetorTelefone: f.recetorTelefone,
      recetorEmail: f.recetorEmail,
      recetorMorada: f.recetorMorada,
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
    setTentouEnviar(true);

    const itens = [...lote];
    const formTemDados = form.contentorId && form.emissorNome.trim() && form.recetorNome.trim() && form.nomeCarga.trim();
    if (formTemDados) {
      itens.push(form);
    }

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
      if (resultado === 'enviado') {
        toast.success(`${itens.length} carga${itens.length === 1 ? '' : 's'} enviada${itens.length === 1 ? '' : 's'}.`);
      } else if (resultado === 'offline') {
        toast.info(`${itens.length} carga${itens.length === 1 ? '' : 's'} guardada${itens.length === 1 ? '' : 's'} — vai${itens.length === 1 ? ' enviar' : 'ão enviar'} quando voltares a ficar online.`);
      } else {
        toast.warning(`${itens.length} carga${itens.length === 1 ? '' : 's'} guardada${itens.length === 1 ? '' : 's'} na fila (servidor indisponível).`);
      }
      // A lista de Cargas por trás pode já ter sido montada antes desta
      // gravação (ou nem estar montada, se se veio de outra página) —
      // bumpRefresh() é o sinal partilhado que a faz recarregar sozinha,
      // sem depender de pull-to-refresh manual.
      bumpRefresh();
      fechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao guardar as cargas.');
    } finally {
      setEnviando(false);
    }
  }

  function onGrabTouchStart(e: React.TouchEvent<HTMLDivElement>): void {
    dragStartY.current = e.touches[0]!.clientY;
  }

  function onGrabTouchMove(e: React.TouchEvent<HTMLDivElement>): void {
    if (dragStartY.current == null) return;
    const delta = e.touches[0]!.clientY - dragStartY.current;
    if (delta > LIMIAR_MINIMIZAR_PX) {
      dragStartY.current = null;
      minimizar();
    }
  }

  function onGrabTouchEnd(): void {
    dragStartY.current = null;
  }

  // Minimizado — pílula flutuante fixa perto do fundo; toca para voltar à
  // folha cheia (form/lote preservados, nunca desmontam), X descarta tudo.
  if (estado === 'minimizado') {
    return (
      <button
        type="button"
        onClick={restaurar}
        className="fixed inset-x-4 z-50 flex items-center gap-2.5 rounded-pill bg-primary px-4 py-3 text-left shadow-medium transition-transform active:scale-[0.98]"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <Layers size={18} className="shrink-0 text-white" />
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-white">
          Nova carga{lote.length > 0 ? ` · ${lote.length} no lote` : ''}
        </span>
        <ChevronUp size={16} className="shrink-0 text-white/80" />
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            fechar();
          }}
          title="Descartar"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/80 active:bg-white/15"
        >
          <X size={16} />
        </span>
      </button>
    );
  }

  // Aberto — bottom sheet (não mais full-screen): a Cargas fica visível
  // e esmaecida por trás, minimizar (grabber ou botão) preserva os
  // dados, só "Descartar" na pílula minimizada os apaga de vez.
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${entrada ? 'opacity-100' : 'opacity-0'}`}
        onClick={minimizar}
      />
      <div
        className={`relative flex max-h-[92vh] flex-col rounded-t-surface bg-bg-app shadow-2xl transition-transform duration-200 ${
          entrada ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div
          className="flex shrink-0 cursor-grab justify-center pb-1 pt-2.5"
          onTouchStart={onGrabTouchStart}
          onTouchMove={onGrabTouchMove}
          onTouchEnd={onGrabTouchEnd}
        >
          <div className="h-1.5 w-10 rounded-full bg-border" />
        </div>

        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 pb-3">
          <button
            type="button"
            onClick={minimizar}
            title="Minimizar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-text-secondary active:bg-bg-app"
          >
            <Minus size={20} />
          </button>
          <button
            type="button"
            onClick={() => setSeletorContentorAberto(true)}
            className={`flex min-w-0 flex-1 items-center justify-center truncate rounded-control border bg-bg-input px-2 py-1.5 text-center text-[13px] font-medium text-text-primary ${
              tentouEnviar && !form.contentorId ? 'border-error' : 'border-border/60'
            }`}
          >
            {contentorAtual ? `${contentorAtual.codigo} — ${contentorAtual.nome}` : 'Sem contentor atribuído — toca para escolher'}
          </button>
          <div title="Agrupar cargas deste emissor sob a mesma referência">
            <Switch checked={codigoUnicoEmissor} onChange={setCodigoUnicoEmissor} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-2">
            {/* Emissor — seta azul pequena identifica quem envia (ícone,
                não bloco de cor) */}
            <section className="flex flex-col gap-1.5 rounded-surface border border-border bg-bg-app p-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <FloatingLabelInput
                    label="Emissor"
                    list="sugestoes-nomes"
                    icon={ArrowUpRight}
                    iconClassName="text-primary"
                    value={form.emissorNome}
                    onChange={(e) => update('emissorNome', e.target.value)}
                    error={tentouEnviar && !form.emissorNome.trim() ? 'Obrigatório' : undefined}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setEmissorExpandido((v) => !v)}
                  title="Mais campos do emissor"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control border transition-colors ${emissorExpandido ? 'border-primary text-primary' : 'border-border text-text-tertiary'}`}
                >
                  <ChevronDown size={18} className={`transition-transform ${emissorExpandido ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {emissorExpandido ? (
                  <div className="flex flex-col gap-1.5 border-t border-border pt-2">
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
                    <FloatingLabelInput
                      label="Morada do emissor"
                      fieldSize="sm"
                      icon={MapPin}
                      iconClassName="text-primary/70"
                      value={form.emissorMorada ?? ''}
                      onChange={(e) => update('emissorMorada', e.target.value || null)}
                    />
                  </div>
                ) : null}
            </section>

            <datalist id="sugestoes-nomes">
              {sugestoes.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>

            {/* Recetor — seta verde pequena identifica quem recebe (ícone,
                não bloco de cor) */}
            <section className="flex flex-col gap-1.5 rounded-surface border border-border bg-bg-app p-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <FloatingLabelInput
                    label="Recetor"
                    list="sugestoes-nomes"
                    icon={ArrowDownLeft}
                    iconClassName="text-success"
                    value={form.recetorNome}
                    onChange={(e) => update('recetorNome', e.target.value)}
                    error={tentouEnviar && !form.recetorNome.trim() ? 'Obrigatório' : undefined}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRecetorExpandido((v) => !v)}
                  title="Mais campos do recetor"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control border transition-colors ${recetorExpandido ? 'border-success text-success' : 'border-border text-text-tertiary'}`}
                >
                  <ChevronDown size={18} className={`transition-transform ${recetorExpandido ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {recetorExpandido ? (
                <div className="flex flex-col gap-1.5 border-t border-border pt-2">
                  <PhoneField label="Telefone do recetor" paises={PAISES_RECETOR} corClass="text-success" value={form.recetorTelefone} onChange={(v) => update('recetorTelefone', v)} />
                  <FloatingLabelInput
                    label="Email do recetor"
                    fieldSize="sm"
                    icon={Mail}
                    iconClassName="text-success/70"
                    value={form.recetorEmail ?? ''}
                    onChange={(e) => update('recetorEmail', e.target.value || null)}
                  />
                  <FloatingLabelInput
                    label="Morada do recetor"
                    fieldSize="sm"
                    icon={MapPin}
                    iconClassName="text-success/70"
                    value={form.recetorMorada ?? ''}
                    onChange={(e) => update('recetorMorada', e.target.value || null)}
                  />
                </div>
              ) : null}
            </section>

            <div className="h-px bg-border" />

            <FloatingLabelInput
              label="Nome da carga"
              list="sugestoes-cargas"
              icon={Package}
              value={form.nomeCarga}
              onChange={(e) => update('nomeCarga', e.target.value)}
              error={tentouEnviar && !form.nomeCarga.trim() ? 'Obrigatório' : undefined}
            />
            <datalist id="sugestoes-cargas">
              {sugestoesCargas.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>

            <div className="grid grid-cols-4 gap-2">
              <FloatingLabelInput label={form.comprimentoCm == null ? 'C (cm)' : ''} aria-label="Comprimento em centímetros" inputMode="decimal" className="text-center tabular-nums" value={form.comprimentoCm ?? ''} onChange={(e) => update('comprimentoCm', numOrNull(e.target.value))} />
              <FloatingLabelInput label={form.larguraCm == null ? 'L (cm)' : ''} aria-label="Largura em centímetros" inputMode="decimal" className="text-center tabular-nums" value={form.larguraCm ?? ''} onChange={(e) => update('larguraCm', numOrNull(e.target.value))} />
              <FloatingLabelInput label={form.alturaCm == null ? 'A (cm)' : ''} aria-label="Altura em centímetros" inputMode="decimal" className="text-center tabular-nums" value={form.alturaCm ?? ''} onChange={(e) => update('alturaCm', numOrNull(e.target.value))} />
              <FloatingLabelInput label={form.pesoKg == null ? 'Peso (kg)' : ''} aria-label="Peso em quilogramas" inputMode="decimal" className="text-center tabular-nums" value={form.pesoKg ?? ''} onChange={(e) => update('pesoKg', numOrNull(e.target.value))} />
            </div>
            <FloatingLabelInput
              label="Valor"
              icon={Euro}
              type="number"
              className="tabular-nums"
              value={form.valor ?? ''}
              onChange={(e) => update('valor', numOrNull(e.target.value))}
              rightSlot={<Switch checked={form.pago} onChange={(v) => update('pago', v)} label={form.pago ? 'Pago' : 'Devido'} />}
            />
            <p className="text-right text-[12px] text-text-tertiary">
              {m3Preview == null ? 'm³: —' : `m³: ${m3Preview.toFixed(3)}`}
            </p>

            {notasExpandido ? null : (
              <button
                type="button"
                onClick={() => setNotasExpandido(true)}
                className="flex min-h-touch w-full items-center gap-2 rounded-control border border-dashed border-border/60 px-3 text-[13px] text-text-tertiary active:bg-bg-app"
              >
                <StickyNote size={14} /> Notas (opcional)
              </button>
            )}

            {notasExpandido ? (
              <FloatingLabelInput as="textarea" label="Notas" icon={StickyNote} value={form.notas ?? ''} onChange={(e) => update('notas', e.target.value || null)} />
            ) : null}
          </div>

          {lote.length > 0 ? (
            <div className="-mx-3 mt-3 border-t-2 border-dashed border-warning/30 bg-warning/[0.05] pb-1 pt-2.5">
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
                      acoes={acoes}
                      compacto
                      linha={{
                        id: `lote-${index}`,
                        codigo: `#${referencias?.get(item.emissorNome.trim().toLowerCase()) ?? index + 1}`,
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

        <div
          className="flex shrink-0 gap-2 border-t border-border/60 p-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        >
          <button
            type="button"
            onClick={handleEmpilhar}
            className="flex min-h-touch flex-1 items-center justify-center gap-1.5 rounded-pill border border-primary text-[14px] font-semibold text-primary active:bg-primary-light"
          >
            <Layers size={16} /> Guardar e adicionar outra
          </button>
          <button
            type="button"
            disabled={enviando}
            onClick={() => void handleEnviar()}
            className="btn-primary flex flex-1 items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {enviando ? 'A enviar...' : (
              <>
                <Send size={15} /> {`Enviar${lote.length > 0 ? ` (${lote.length})` : ''}`}
              </>
            )}
          </button>
        </div>

        <ContentorPickerSheet
          open={seletorContentorAberto}
          onClose={() => setSeletorContentorAberto(false)}
          contentores={contentores}
          contentorAtivoId={form.contentorId}
          onSelecionar={(id) => {
            selecionarContentor(id);
            update('contentorId', id);
          }}
        />
      </div>
    </div>
  );
}
