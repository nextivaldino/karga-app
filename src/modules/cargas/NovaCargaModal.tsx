import { useEffect, useRef, useState } from 'react';
import { CaretDown, CaretRight as ChevronRight, X } from '@phosphor-icons/react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { Switch } from '@/components/ui/Switch';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { ipcService } from '@/services/ipcService';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { incrementCodigo } from '@/lib/incrementCodigo';
import { SYNC_HEADER_BG, SYNC_INK } from '@/modules/sync/syncVisual';
import { ContactoAutocomplete, EMPTY_CONTACTO_VALUE, type ContactoFormValue } from './ContactoAutocomplete';
import type { CargaComEmissor, Contentor, CreateCargaBatchItem, CreateContactoInput, SugestaoDimensoes } from '@/types';

interface NovaCargaModalProps {
  open: boolean;
  onClose: () => void;
  contentoresAbertos: Contentor[];
  defaultContentorId: string | null;
  editingCarga: CargaComEmissor | null;
  onSaved: () => void;
}

interface StackedCarga {
  tempId: string;
  input: CreateCargaBatchItem;
  m3: number | null;
}

type CodigoModo = 'automatico' | 'manual';

function parseNum(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function buildPartialContactoChanges(value: ContactoFormValue): Partial<CreateContactoInput> {
  const changes: Partial<CreateContactoInput> = {};
  if (value.telefone.trim()) changes.telefone = value.telefone.trim();
  if (value.email.trim()) changes.email = value.email.trim();
  if (value.morada.trim()) changes.morada = value.morada.trim();
  if (value.nif.trim()) changes.nif = value.nif.trim();
  return changes;
}

async function resolveContacto(value: ContactoFormValue): Promise<string | null> {
  const nome = value.nome.trim();
  if (!nome) return null;

  let contactoId = value.contactoId;
  if (!contactoId) {
    const matches = await ipcService.contactos.search(nome, 5);
    const exact = matches.find((m) => m.nome.toLowerCase() === nome.toLowerCase());
    contactoId = exact?.id ?? null;
  }

  if (contactoId) {
    const changes = buildPartialContactoChanges(value);
    if (Object.keys(changes).length > 0) {
      await ipcService.contactos.update(contactoId, changes);
    }
    return contactoId;
  }

  const created = await ipcService.contactos.create({ nome, ...buildPartialContactoChanges(value) });
  return created.id;
}

// Seletor de contentor do cabeçalho — substitui o `<select>` nativo (cujo
// popup abre para cima ou para baixo consoante o SO decide, sem controlo
// nosso) por um menu próprio que abre sempre para baixo, e mostra o nome
// do contentor como subtítulo por baixo do código selecionado.
function SeletorContentorHeader({
  contentoresAbertos,
  contentorId,
  onSelect,
}: {
  contentoresAbertos: Contentor[];
  contentorId: string | null;
  onSelect: (id: string) => void;
}): React.JSX.Element {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selecionado = contentoresAbertos.find((c) => c.id === contentorId) ?? null;

  useEffect(() => {
    if (!aberto) return;
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setAberto(false);
    }
    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [aberto]);

  return (
    <div ref={ref} className="relative flex w-full justify-center">
      <button type="button" onClick={() => setAberto((v) => !v)} className="flex flex-col items-center" style={{ color: SYNC_INK }}>
        <span className="flex items-center gap-1.5 text-[15px] font-semibold leading-tight">
          Contêiner: {selecionado?.codigo ?? '—'}
          <CaretDown size={13} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />
        </span>
        {selecionado ? <span className="truncate text-[11px] font-normal leading-tight opacity-70">{selecionado.nome}</span> : null}
      </button>

      {aberto ? (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 overflow-hidden rounded-control border border-border bg-bg-surface py-1 text-left shadow-lg">
          {contentoresAbertos.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={c.bloqueado}
              onClick={() => {
                onSelect(c.id);
                setAberto(false);
              }}
              className="flex w-full flex-col items-start px-3 py-1.5 text-left transition-colors hover:bg-bg-app disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="text-[13px] font-medium text-text-primary">
                {c.codigo}
                {c.bloqueado ? ' 🔒 (bloqueado)' : ''}
              </span>
              <span className="truncate text-[11px] text-text-tertiary">{c.nome}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function NovaCargaModal({
  open,
  onClose,
  contentoresAbertos,
  defaultContentorId,
  editingCarga,
  onSaved,
}: NovaCargaModalProps): React.JSX.Element | null {
  const isEditMode = editingCarga != null;

  const [contentorId, setContentorId] = useState<string | null>(defaultContentorId);
  const [codigo, setCodigo] = useState('');
  const [codigoModo, setCodigoModo] = useState<CodigoModo>('automatico');
  const [codigoUnicoEmissor, setCodigoUnicoEmissor] = useState(false);
  const [emissor, setEmissor] = useState<ContactoFormValue>(EMPTY_CONTACTO_VALUE);
  const [recetor, setRecetor] = useState<ContactoFormValue>(EMPTY_CONTACTO_VALUE);
  const [mostrarMaisCampos, setMostrarMaisCampos] = useState(false);
  const [nome, setNome] = useState('');
  const [comprimentoCm, setComprimentoCm] = useState('');
  const [larguraCm, setLarguraCm] = useState('');
  const [alturaCm, setAlturaCm] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [valor, setValor] = useState('');
  const [estadoPagamento, setEstadoPagamento] = useState<'pago' | 'devido'>('devido');
  const [pilha, setPilha] = useState<StackedCarga[]>([]);
  const [confirmFecharOpen, setConfirmFecharOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "Aprende" com cargas anteriores do mesmo nome (ex: "Bidon" já usado
  // 3x com 22×22×22) — só sugere, nunca impõe, e nunca mexe no peso.
  const [sugestaoDimensoes, setSugestaoDimensoes] = useState<SugestaoDimensoes | null>(null);
  const [sugestaoIgnoradaPara, setSugestaoIgnoradaPara] = useState('');

  useEffect(() => {
    if (!open) return;
    setPilha([]);
    setError(null);
    setMostrarMaisCampos(false);
    setCodigoUnicoEmissor(false);

    if (editingCarga) {
      setContentorId(editingCarga.contentorId ?? defaultContentorId);
      setCodigo(editingCarga.codigo);
      setCodigoModo('manual');
      setEmissor({
        nome: editingCarga.emissorNome,
        contactoId: editingCarga.emissorId,
        telefone: '',
        email: '',
        morada: '',
        nif: '',
      });
      setRecetor(EMPTY_CONTACTO_VALUE);
      setNome(editingCarga.nome);
      setComprimentoCm(editingCarga.comprimentoCm != null ? String(editingCarga.comprimentoCm) : '');
      setLarguraCm(editingCarga.larguraCm != null ? String(editingCarga.larguraCm) : '');
      setAlturaCm(editingCarga.alturaCm != null ? String(editingCarga.alturaCm) : '');
      setPesoKg(editingCarga.pesoKg != null ? String(editingCarga.pesoKg) : '');
      setValor(editingCarga.valor != null ? String(editingCarga.valor) : '');
      setEstadoPagamento(editingCarga.estadoPagamento);
    } else {
      // Se o contentor ativo estiver entretanto bloqueado, não o propomos
      // como destino por definição — cai para o primeiro aberto disponível.
      const defaultBloqueado = contentoresAbertos.find((c) => c.id === defaultContentorId)?.bloqueado;
      setContentorId(defaultBloqueado ? contentoresAbertos.find((c) => !c.bloqueado)?.id ?? defaultContentorId : defaultContentorId);
      setCodigoModo('automatico');
      setEmissor(EMPTY_CONTACTO_VALUE);
      setRecetor(EMPTY_CONTACTO_VALUE);
      setNome('');
      setComprimentoCm('');
      setLarguraCm('');
      setAlturaCm('');
      setPesoKg('');
      setValor('');
      setEstadoPagamento('devido');
      void ipcService.cargas.nextCodigo().then(setCodigo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultContentorId, editingCarga]);

  // Só sugere dimensões para cargas novas (nunca ao editar uma já
  // existente) e só enquanto C/L/A continuarem vazios — mal o
  // utilizador preencha algum à mão, a sugestão deixa de fazer sentido
  // e não volta a aparecer para este nome nesta sessão do formulário.
  useEffect(() => {
    if (!open || isEditMode) return;
    const nomeTrim = nome.trim();
    if (nomeTrim.length < 2 || comprimentoCm || larguraCm || alturaCm || nomeTrim === sugestaoIgnoradaPara) {
      setSugestaoDimensoes(null);
      return;
    }
    const timeout = setTimeout(() => {
      void ipcService.cargas.sugerirDimensoes(nomeTrim).then(setSugestaoDimensoes);
    }, 400);
    return () => clearTimeout(timeout);
  }, [open, isEditMode, nome, comprimentoCm, larguraCm, alturaCm, sugestaoIgnoradaPara]);

  function handleUsarSugestaoDimensoes(): void {
    if (!sugestaoDimensoes) return;
    setComprimentoCm(String(sugestaoDimensoes.comprimentoCm));
    setLarguraCm(String(sugestaoDimensoes.larguraCm));
    setAlturaCm(String(sugestaoDimensoes.alturaCm));
    setSugestaoDimensoes(null);
  }

  function handleToggleCodigoModo(manual: boolean): void {
    if (manual) {
      setCodigoModo('manual');
      setCodigo('');
    } else {
      setCodigoModo('automatico');
      void ipcService.cargas.nextCodigo().then(setCodigo);
    }
  }

  // "Código único para este emissor" — agrupa várias cargas do mesmo
  // emissor sob um único código-base ("TF010", "TF010-A", "TF010-B"...).
  // Só faz sentido com um emissor já existente e concreto (contactoId
  // definido), porque o código-base fica gravado nesse contacto.
  //
  // `reservados` cobre os códigos já atribuídos a cargas empilhadas
  // nesta sessão mas ainda não gravadas — sem isto, duas cargas
  // empilhadas seguidas do mesmo emissor receberiam a mesma sugestão.
  function codigosReservadosNaPilha(emissorId: string): string[] {
    return pilha.filter((p) => p.input.emissorId === emissorId).map((p) => p.input.codigo);
  }

  async function handleToggleCodigoUnico(ativo: boolean): Promise<void> {
    setCodigoUnicoEmissor(ativo);
    if (ativo && emissor.contactoId) {
      const proximo = await ipcService.cargas.nextCodigoAgrupado(emissor.contactoId, codigosReservadosNaPilha(emissor.contactoId));
      setCodigo(proximo);
    } else if (!ativo) {
      setCodigoModo('automatico');
      void ipcService.cargas.nextCodigo().then(setCodigo);
    }
  }

  useEffect(() => {
    if (codigoUnicoEmissor && emissor.contactoId) {
      void ipcService.cargas
        .nextCodigoAgrupado(emissor.contactoId, codigosReservadosNaPilha(emissor.contactoId))
        .then(setCodigo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoUnicoEmissor, emissor.contactoId]);

  const m3Preview = (() => {
    const c = parseNum(comprimentoCm);
    const l = parseNum(larguraCm);
    const a = parseNum(alturaCm);
    if (c == null || l == null || a == null) return null;
    return (c * l * a) / 1_000_000;
  })();

  // Nota: não considera emissor/recetor, porque esses persistem propositadamente
  // entre empilhamentos (para empilhar várias cargas do mesmo emissor sem
  // reescrever o nome a cada vez) — não indicam que uma nova carga está em curso.
  function isCurrentFormEmpty(): boolean {
    return (
      !nome.trim() &&
      !comprimentoCm.trim() &&
      !larguraCm.trim() &&
      !alturaCm.trim() &&
      !pesoKg.trim() &&
      !valor.trim()
    );
  }

  function validateCurrentForm(): boolean {
    if (!contentorId) {
      setError('Selecione um contêiner.');
      return false;
    }
    if (!codigo.trim()) {
      setError('Código é obrigatório.');
      return false;
    }
    if (!nome.trim()) {
      setError('Nome da carga é obrigatório.');
      return false;
    }
    if (!emissor.nome.trim()) {
      setError('Emissor é obrigatório.');
      return false;
    }
    return true;
  }

  function clearCargaFields(): void {
    setNome('');
    setComprimentoCm('');
    setLarguraCm('');
    setAlturaCm('');
    setPesoKg('');
    setValor('');
    setEstadoPagamento('devido');
  }

  async function handleEmpilhar(): Promise<void> {
    setError(null);
    if (!validateCurrentForm()) return;

    setSaving(true);
    try {
      const emissorId = await resolveContacto(emissor);
      if (!emissorId) throw new Error('Emissor inválido.');
      if (!emissor.contactoId) setEmissor((prev) => ({ ...prev, contactoId: emissorId }));

      let recetorId: string | null = null;
      if (recetor.nome.trim()) {
        recetorId = await resolveContacto(recetor);
        if (!recetor.contactoId && recetorId) setRecetor((prev) => ({ ...prev, contactoId: recetorId }));
      }

      const item: CreateCargaBatchItem = {
        codigo: codigo.trim(),
        nome: nome.trim(),
        comprimentoCm: parseNum(comprimentoCm),
        larguraCm: parseNum(larguraCm),
        alturaCm: parseNum(alturaCm),
        pesoKg: parseNum(pesoKg),
        valor: parseNum(valor),
        estadoPagamento,
        contentorId,
        emissorId,
        recetorId,
      };

      setPilha((prev) => [...prev, { tempId: crypto.randomUUID(), input: item, m3: m3Preview }]);
      clearCargaFields();
      if (codigoUnicoEmissor) {
        // `pilha` no closure ainda não inclui o item que acabou de ser
        // empilhado (setState é assíncrono) — junta-o manualmente à
        // lista de reservados para não sugerir o mesmo código outra vez.
        const reservados = [...codigosReservadosNaPilha(emissorId), item.codigo];
        void ipcService.cargas.nextCodigoAgrupado(emissorId, reservados).then(setCodigo);
      } else {
        setCodigo(codigoModo === 'automatico' ? incrementCodigo(item.codigo) : '');
      }
    } catch (err) {
      setError(err instanceof Error ? cleanIpcError(err) : 'Erro ao empilhar carga.');
    } finally {
      setSaving(false);
    }
  }

  function removeFromPilha(tempId: string): void {
    setPilha((prev) => prev.filter((item) => item.tempId !== tempId));
  }

  async function handleSaveCreate(): Promise<void> {
    setError(null);
    const formEmpty = isCurrentFormEmpty();

    if (formEmpty && pilha.length === 0) {
      setError('Preencha os dados da carga ou empilhe pelo menos uma.');
      return;
    }
    if (!formEmpty && !validateCurrentForm()) return;
    if (!contentorId) {
      setError('Selecione um contêiner.');
      return;
    }

    setSaving(true);
    try {
      const allItems: CreateCargaBatchItem[] = [...pilha.map((s) => s.input)];

      if (!formEmpty) {
        const emissorId = await resolveContacto(emissor);
        if (!emissorId) throw new Error('Emissor inválido.');
        const recetorId = recetor.nome.trim() ? await resolveContacto(recetor) : null;

        allItems.push({
          codigo: codigo.trim(),
          nome: nome.trim(),
          comprimentoCm: parseNum(comprimentoCm),
          larguraCm: parseNum(larguraCm),
          alturaCm: parseNum(alturaCm),
          pesoKg: parseNum(pesoKg),
          valor: parseNum(valor),
          estadoPagamento,
          contentorId,
          emissorId,
          recetorId,
        });
      }

      const created = await ipcService.cargas.createBatch(allItems);

      toast.success(created.length > 1 ? `${created.length} cargas guardadas.` : `Carga ${created[0]!.codigo} guardada.`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? cleanIpcError(err) : 'Erro ao guardar as cargas.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(): Promise<void> {
    if (!editingCarga) return;
    setError(null);
    if (!validateCurrentForm() || !contentorId) return;

    setSaving(true);
    try {
      const emissorId = await resolveContacto(emissor);
      if (!emissorId) throw new Error('Emissor inválido.');

      await ipcService.cargas.update(editingCarga.id, {
        codigo: codigo.trim(),
        nome: nome.trim(),
        comprimentoCm: parseNum(comprimentoCm),
        larguraCm: parseNum(larguraCm),
        alturaCm: parseNum(alturaCm),
        pesoKg: parseNum(pesoKg),
        valor: parseNum(valor),
        estadoPagamento,
        contentorId,
        emissorId,
      });

      toast.success(`Carga ${codigo.trim()} atualizada.`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? cleanIpcError(err) : 'Erro ao atualizar a carga.');
    } finally {
      setSaving(false);
    }
  }

  function handleRequestClose(): void {
    if (!isEditMode && pilha.length > 0) {
      setConfirmFecharOpen(true);
      return;
    }
    onClose();
  }

  return (
    <HeaderBarModal
      open={open}
      onClose={handleRequestClose}
      widthClassName={!isEditMode && pilha.length > 0 ? 'max-w-[760px]' : 'max-w-[520px]'}
      headerClassName="h-14 px-4"
      headerStyle={{ backgroundColor: SYNC_HEADER_BG }}
      title={<SeletorContentorHeader contentoresAbertos={contentoresAbertos} contentorId={contentorId} onSelect={setContentorId} />}
      footer={
        <>
          <button
            type="button"
            onClick={handleRequestClose}
            className="rounded-control px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
          >
            Cancelar
          </button>
          {!isEditMode ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleEmpilhar()}
              className="rounded-control border border-border px-4 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-app disabled:opacity-60"
            >
              + Empilhar
            </button>
          ) : null}
          <button
            type="button"
            disabled={saving}
            onClick={() => void (isEditMode ? handleSaveEdit() : handleSaveCreate())}
            className="rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? 'A guardar...' : 'Guardar'}
          </button>
        </>
      }
    >
      <div className="flex gap-lg">
        <div className="flex flex-1 flex-col gap-md">
          <div className="flex items-center gap-3">
            <div className="w-32 shrink-0">
              <FloatingLabelInput
                label="Código"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                disabled={codigoUnicoEmissor}
              />
            </div>
            <div className={`flex items-center gap-2 text-[13px] ${codigoUnicoEmissor ? 'opacity-40' : ''}`}>
              <span className={codigoModo === 'automatico' ? 'text-text-primary' : 'text-text-tertiary'}>Automático</span>
              <Switch checked={codigoModo === 'manual'} onChange={handleToggleCodigoModo} disabled={codigoUnicoEmissor} />
              <span className={codigoModo === 'manual' ? 'text-text-primary' : 'text-text-tertiary'}>Manual</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-md">
            <ContactoAutocomplete label="Emissor" value={emissor} onChange={setEmissor} required />
            <ContactoAutocomplete label="Recetor" value={recetor} onChange={setRecetor} />
          </div>

          <div
            className="flex items-center justify-between gap-3 rounded-control border border-border bg-bg-app px-3 py-2.5"
            title={!emissor.contactoId ? 'Escolhe um emissor já existente para poder agrupar as cargas dele sob um código único.' : undefined}
          >
            <div>
              <p className="text-[13px] font-medium text-text-primary">Código único para este emissor</p>
              <p className="text-[11px] text-text-tertiary">
                Agrupa as cargas deste emissor sob o mesmo código-base (ex: "TF010", "TF010-A", "TF010-B"...).
              </p>
            </div>
            <Switch
              checked={codigoUnicoEmissor}
              disabled={!emissor.contactoId}
              onChange={(v) => void handleToggleCodigoUnico(v)}
            />
          </div>

          <button
            type="button"
            onClick={() => setMostrarMaisCampos((v) => !v)}
            className="flex w-fit items-center gap-1 text-[12px] font-medium text-primary"
          >
            <ChevronRight size={14} className={`transition-transform ${mostrarMaisCampos ? 'rotate-90' : ''}`} />
            mais campos
          </button>

          {mostrarMaisCampos ? (
            <div className="grid grid-cols-2 gap-md rounded-control bg-bg-app p-md">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Emissor {emissor.contactoId ? '(existente)' : ''}
                </span>
                <FloatingLabelInput
                  label="Telefone"
                  value={emissor.telefone}
                  onChange={(e) => setEmissor({ ...emissor, telefone: e.target.value })}
                />
                <FloatingLabelInput
                  label="Email"
                  value={emissor.email}
                  onChange={(e) => setEmissor({ ...emissor, email: e.target.value })}
                />
                <FloatingLabelInput
                  label="Morada"
                  value={emissor.morada}
                  onChange={(e) => setEmissor({ ...emissor, morada: e.target.value })}
                />
                <FloatingLabelInput
                  label="NIF"
                  value={emissor.nif}
                  onChange={(e) => setEmissor({ ...emissor, nif: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Recetor {recetor.contactoId ? '(existente)' : ''}
                </span>
                <FloatingLabelInput
                  label="Telefone"
                  value={recetor.telefone}
                  onChange={(e) => setRecetor({ ...recetor, telefone: e.target.value })}
                />
                <FloatingLabelInput
                  label="Email"
                  value={recetor.email}
                  onChange={(e) => setRecetor({ ...recetor, email: e.target.value })}
                />
                <FloatingLabelInput
                  label="Morada"
                  value={recetor.morada}
                  onChange={(e) => setRecetor({ ...recetor, morada: e.target.value })}
                />
                <FloatingLabelInput
                  label="NIF"
                  value={recetor.nif}
                  onChange={(e) => setRecetor({ ...recetor, nif: e.target.value })}
                />
              </div>
            </div>
          ) : null}

          <FloatingLabelInput label="Nome da carga" value={nome} onChange={(e) => setNome(e.target.value)} required />

          {sugestaoDimensoes ? (
            <div className="flex items-center gap-2 rounded-control border border-primary/30 bg-primary-light px-3 py-2 text-[12px] text-text-primary">
              <span className="min-w-0 flex-1">
                Já usámos{' '}
                <strong>
                  {sugestaoDimensoes.comprimentoCm}×{sugestaoDimensoes.larguraCm}×{sugestaoDimensoes.alturaCm} cm
                </strong>{' '}
                para "{nome.trim()}" antes ({sugestaoDimensoes.ocorrencias}x).
              </span>
              <button
                type="button"
                onClick={() => setSugestaoIgnoradaPara(nome.trim())}
                className="shrink-0 rounded-control px-2 py-1 font-medium text-text-secondary transition-colors hover:bg-bg-surface"
              >
                Ignorar
              </button>
              <button
                type="button"
                onClick={handleUsarSugestaoDimensoes}
                className="shrink-0 rounded-control bg-primary px-2.5 py-1 font-medium text-white transition-colors hover:bg-primary-hover"
              >
                Usar
              </button>
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <div className="w-16">
              <FloatingLabelInput label="C" type="number" value={comprimentoCm} onChange={(e) => setComprimentoCm(e.target.value)} />
            </div>
            <div className="w-16">
              <FloatingLabelInput label="L" type="number" value={larguraCm} onChange={(e) => setLarguraCm(e.target.value)} />
            </div>
            <div className="w-16">
              <FloatingLabelInput label="A" type="number" value={alturaCm} onChange={(e) => setAlturaCm(e.target.value)} />
            </div>
            <div className="w-20">
              <FloatingLabelInput label="Peso" type="number" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} />
            </div>
            <div className="w-24">
              <FloatingLabelInput label="Valor" type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <span className="whitespace-nowrap pb-2 text-[12px] text-text-tertiary">
              {m3Preview == null ? 'm³: —' : `m³: ${m3Preview.toFixed(3)}`}
            </span>
          </div>

          <Switch
            checked={estadoPagamento === 'pago'}
            onChange={(checked) => setEstadoPagamento(checked ? 'pago' : 'devido')}
            label={estadoPagamento === 'pago' ? 'Pago' : 'Devido'}
          />

          {error ? <p className="text-[13px] text-error">{error}</p> : null}
        </div>

        {!isEditMode && pilha.length > 0 ? (
          <div className="w-56 shrink-0 border-l border-border pl-lg">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              Cargas empilhadas
            </h3>
            <div className="flex flex-col gap-2">
              {pilha.map((item) => (
                <div key={item.tempId} className="flex items-start justify-between gap-2 border-b border-border pb-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-text-primary">{item.input.nome}</div>
                    <div className="text-[12px] text-text-tertiary">
                      {item.input.codigo} · {item.m3 != null ? `${item.m3.toFixed(3)}m³` : '—'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromPilha(item.tempId)}
                    className="shrink-0 text-text-tertiary transition-colors hover:text-error"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {!isCurrentFormEmpty() ? (
                <div className="text-[12px] italic text-text-tertiary">+ esta carga (atual)</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmFecharOpen}
        title="Cargas Empilhadas"
        message={`Tem ${pilha.length} carga${pilha.length === 1 ? '' : 's'} empilhada${pilha.length === 1 ? '' : 's'} por gravar. Gravar antes de sair?`}
        confirmLabel="Gravar"
        onConfirm={() => {
          setConfirmFecharOpen(false);
          void handleSaveCreate();
        }}
        onCancel={() => setConfirmFecharOpen(false)}
      />
    </HeaderBarModal>
  );
}
