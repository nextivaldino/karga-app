import { useEffect, useState } from 'react';
import {
  CaretDown as ChevronDown,
  CaretLeft,
  CaretRight,
  DotsThree,
  EnvelopeSimple as Mail,
  PencilSimple as Pencil,
  Phone,
  Receipt,
  PaperPlaneTilt as Send,
  Trash as Trash2,
  User,
} from '@phosphor-icons/react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { formatValor } from '@/lib/formatValor';
import { ipcService } from '@/services/ipcService';
import { ContactoFormModal } from '@/modules/contactos/ContactoFormModal';
import { NovaCargaModal } from '@/modules/cargas/NovaCargaModal';
import { EnviarResumoModal } from '@/modules/cargas/EnviarResumoModal';
import { FaturaPreviewModal } from '@/modules/cargas/FaturaPreviewModal';
import { useCargaAcoesMenu } from '@/modules/cargas/useCargaAcoesMenu';
import { TagPicker } from './TagPicker';
import type { CargaComEmissor, CargaComPapel, ClienteFaturacao, Contentor, Etiqueta } from '@/types';

interface ClientePainelProps {
  cliente: ClienteFaturacao;
  contentorId: string | null;
  escopoTodos: boolean;
  contentoresAbertos: Contentor[];
  todasEtiquetas: Etiqueta[];
  onDataChanged: () => void;
}

// Mesma paleta pastel e numeração da lista de cargas da página Cargas —
// pedido explícito para as duas ficarem com a formatação igual.
const ROW_TINTS = ['var(--color-primary)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-purple)'];

// Botão "Enviar" — abre diretamente o recibo (`EnviarResumoModal`), que
// já mostra os dois canais (WhatsApp/E-mail) lá dentro; já não precisa
// de perguntar o canal antes de abrir o popup.
function BotaoEnviar({ temTelefone, temEmail, onClick }: { temTelefone: boolean; temEmail: boolean; onClick: () => void }): React.JSX.Element {
  const disponivel = temTelefone || temEmail;
  return (
    <button
      type="button"
      disabled={!disponivel}
      onClick={onClick}
      title={disponivel ? 'Enviar recibo' : 'Sem telefone nem email registados'}
      className="flex h-8 items-center gap-1.5 rounded-control border border-border bg-bg-surface px-3 text-[12px] font-medium text-primary transition-colors hover:bg-bg-app disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Send size={13} /> Enviar recibo
    </button>
  );
}

export function ClientePainel({
  cliente,
  contentorId,
  escopoTodos,
  contentoresAbertos,
  todasEtiquetas,
  onDataChanged,
}: ClientePainelProps): React.JSX.Element {
  const [cargas, setCargas] = useState<CargaComPapel[]>([]);
  const [contentoresPorId, setContentoresPorId] = useState<Record<string, Contentor>>({});
  const [colapsados, setColapsados] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [movendoPara, setMovendoPara] = useState('');
  const [movendoLote, setMovendoLote] = useState(false);
  const [confirmarArquivarLote, setConfirmarArquivarLote] = useState(false);
  const [editandoContacto, setEditandoContacto] = useState(false);
  const [editingCarga, setEditingCarga] = useState<CargaComEmissor | null>(null);
  const [novaCargaOpen, setNovaCargaOpen] = useState(false);
  const [envioAberto, setEnvioAberto] = useState(false);
  const [faturaOpen, setFaturaOpen] = useState(false);
  const [detalheAberto, setDetalheAberto] = useState(true);

  const { abrirMenu, abrirMenuNoBotao, renderMenu, handleTogglePagamento } = useCargaAcoesMenu({
    onEditar: (carga) => {
      setEditingCarga(carga);
      setNovaCargaOpen(true);
    },
    contentoresAbertos,
    onDataChanged: () => {
      void carregar();
      onDataChanged();
    },
  });

  async function carregar(): Promise<void> {
    setLoading(true);
    const cargasPromise = ipcService.cargas.listarPorContacto(cliente.id, {
      contentorId: escopoTodos ? undefined : (contentorId ?? undefined),
    });
    const contentoresPromise = escopoTodos
      ? ipcService.contentores.list({ incluirOcultos: true })
      : Promise.resolve<Contentor[]>([]);
    const [items, contentores] = await Promise.all([cargasPromise, contentoresPromise]);
    setCargas(items);
    setContentoresPorId(Object.fromEntries(contentores.map((c) => [c.id, c])));
    setSelecionados(new Set());
    setLoading(false);
  }

  useEffect(() => {
    setColapsados({});
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id, contentorId, escopoTodos]);

  function toggleSelecionado(id: string): void {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleColapsado(key: string): void {
    setColapsados((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleMoverSelecionadas(): Promise<void> {
    if (!movendoPara || selecionados.size === 0) return;
    setMovendoLote(true);
    try {
      await ipcService.cargas.moverEmLote([...selecionados], movendoPara);
      toast.success(`${selecionados.size} carga(s) movida(s).`);
      setMovendoPara('');
      void carregar();
      onDataChanged();
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setMovendoLote(false);
    }
  }

  async function handleArquivarSelecionadas(): Promise<void> {
    try {
      await Promise.all([...selecionados].map((id) => ipcService.cargas.archive(id)));
      toast.success(`${selecionados.size} carga(s) arquivada(s).`);
      setConfirmarArquivarLote(false);
      void carregar();
      onDataChanged();
    } catch (err) {
      toast.error(cleanIpcError(err));
    }
  }

  const moeda = cargas[0]?.moeda ?? 'EUR';
  const totalGeral = cargas.reduce((sum, c) => sum + (c.valor ?? 0), 0);
  const totalPago = cargas.filter((c) => c.estadoPagamento === 'pago').reduce((sum, c) => sum + (c.valor ?? 0), 0);
  const totalDevido = cargas.filter((c) => c.estadoPagamento === 'devido').reduce((sum, c) => sum + (c.valor ?? 0), 0);

  const grupos = escopoTodos
    ? Object.entries(
        cargas.reduce<Record<string, CargaComPapel[]>>((acc, c) => {
          const key = c.contentorId ?? 'sem-contentor';
          (acc[key] ??= []).push(c);
          return acc;
        }, {}),
      ).sort(([a], [b]) => (contentoresPorId[a]?.codigo ?? '').localeCompare(contentoresPorId[b]?.codigo ?? ''))
    : [[contentorId ?? 'sem-contentor', cargas] as [string, CargaComPapel[]]];

  const LABEL_PAPEL: Record<string, string> = {
    emissor: 'Emissor',
    recetor: 'Recetor',
    'emissor,recetor': 'Emissor + Recetor',
  };

  function renderLinhaCarga(carga: CargaComPapel): React.JSX.Element {
    const numero = cargas.indexOf(carga) + 1;
    const tint = ROW_TINTS[(numero - 1) % ROW_TINTS.length];
    return (
      <div
        key={carga.id}
        onContextMenu={(e) => {
          e.preventDefault();
          abrirMenu(carga, e.clientX, e.clientY);
        }}
        className="group grid grid-cols-[28px_28px_90px_1fr_90px_80px_100px_32px] items-center px-3 py-2 text-[13px] text-text-primary"
        style={{ backgroundColor: `color-mix(in srgb, ${tint} 5%, var(--bg-surface))` }}
      >
        <span className="truncate text-[12px] text-text-tertiary">{numero}</span>
        <input
          type="checkbox"
          checked={selecionados.has(carga.id)}
          onChange={() => toggleSelecionado(carga.id)}
          className="h-4 w-4"
        />
        <span className="truncate text-[12px]">{carga.codigo}</span>
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="truncate">{carga.nome}</span>
          {carga.papeis.length > 0 ? (
            <span className="shrink-0 rounded-pill bg-bg-app px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
              {LABEL_PAPEL[carga.papeis.join(',')] ?? carga.papeis.join(' + ')}
            </span>
          ) : null}
        </span>
        <span>{formatValor(carga.valor, carga.moeda)}</span>
        <button
          type="button"
          onClick={() => void handleTogglePagamento(carga)}
          className={`w-fit rounded-pill px-2 py-0.5 text-[11px] font-medium transition-colors ${
            carga.estadoPagamento === 'pago' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
          }`}
          title="Clicar para alternar Pago/Devido"
        >
          {carga.estadoPagamento === 'pago' ? 'Pago' : 'Devido'}
        </button>
        <span className="truncate text-[12px] text-text-tertiary">
          {carga.contentorId
            ? (contentoresPorId[carga.contentorId]?.codigo ?? contentoresAbertos.find((c) => c.id === carga.contentorId)?.codigo ?? '—')
            : '—'}
        </span>
        <div className="flex items-center justify-end">
          <button
            type="button"
            title="Gerir carga"
            onClick={(e) => abrirMenuNoBotao(e, carga)}
            className="flex h-7 w-7 items-center justify-center rounded-control text-text-tertiary opacity-0 transition-opacity hover:bg-bg-app hover:text-text-primary group-hover:opacity-100"
          >
            <DotsThree size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      {/* Coluna central: barra de contexto + lista de cargas */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5">
          <h2 className="truncate text-[14px] font-semibold text-text-primary">{cliente.nome}</h2>
          <span className="shrink-0 text-[12px] text-text-tertiary">
            {cargas.length} {cargas.length === 1 ? 'carga' : 'cargas'}
          </span>

          {selecionados.size > 0 ? (
            <div className="ml-3 flex items-center gap-2 rounded-control bg-primary/10 px-2.5 py-1">
              <span className="text-[12px] font-medium text-primary">{selecionados.size} selecionada(s)</span>
              <SelectMenu
                value={movendoPara}
                onChange={setMovendoPara}
                placeholder="Mover para..."
                options={contentoresAbertos.map((c) => ({ value: c.id, label: `${c.codigo} — ${c.nome}` }))}
                className="flex h-7 items-center gap-1 rounded-control border border-border bg-bg-input px-1.5 text-[12px] text-text-primary transition-colors hover:bg-bg-app"
              />
              <button
                type="button"
                disabled={!movendoPara || movendoLote}
                onClick={() => void handleMoverSelecionadas()}
                className="h-7 rounded-control bg-primary px-2.5 text-[12px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                Mover
              </button>
              <button
                type="button"
                onClick={() => setConfirmarArquivarLote(true)}
                className="flex h-7 items-center gap-1 rounded-control px-2 text-[12px] font-medium text-error transition-colors hover:bg-error/10"
              >
                <Trash2 size={12} /> Arquivar
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setDetalheAberto((v) => !v)}
            title={detalheAberto ? 'Esconder detalhes' : 'Mostrar detalhes'}
            className="ml-auto flex h-7 shrink-0 items-center gap-1 rounded-control px-2 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
          >
            {detalheAberto ? <CaretRight size={13} /> : <CaretLeft size={13} />}
            Detalhes
          </button>
        </div>

        {/* Lista de cargas */}
        <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <p className="p-4 text-center text-[13px] text-text-tertiary">A carregar...</p>
        ) : cargas.length === 0 ? (
          <p className="p-4 text-center text-[13px] text-text-tertiary">Este cliente não tem cargas neste âmbito.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {grupos.map(([grupoId, cargasDoGrupo]) => {
              const contentor = contentoresPorId[grupoId];
              const colapsado = colapsados[grupoId];
              const valorGrupo = cargasDoGrupo.reduce((sum, c) => sum + (c.valor ?? 0), 0);
              return (
                <div key={grupoId} className="overflow-hidden rounded-control border border-border">
                  {escopoTodos ? (
                    <button
                      type="button"
                      onClick={() => toggleColapsado(grupoId)}
                      className="flex w-full items-center gap-2 bg-bg-app px-3 py-1.5 text-left text-[12px] font-semibold text-text-secondary transition-colors hover:bg-[var(--toolbar-hover)]"
                    >
                      <ChevronDown size={14} className={`shrink-0 transition-transform ${colapsado ? '-rotate-90' : ''}`} />
                      <span className="flex-1 truncate">
                        {contentor ? `${contentor.codigo} — ${contentor.nome}` : 'Sem contentor'}
                      </span>
                      <span className="shrink-0 text-text-tertiary">
                        {cargasDoGrupo.length} {cargasDoGrupo.length === 1 ? 'carga' : 'cargas'} ·{' '}
                        {formatValor(valorGrupo, cargasDoGrupo[0]?.moeda ?? 'EUR')}
                      </span>
                    </button>
                  ) : null}
                  {!colapsado ? (
                    <div className="grid grid-cols-[28px_28px_90px_1fr_90px_80px_100px_32px] border-b border-border bg-bg-surface px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                      <span>#</span>
                      <span />
                      <span>Código</span>
                      <span>Nome</span>
                      <span>Valor</span>
                      <span>Estado</span>
                      <span>Contentor</span>
                      <span />
                    </div>
                  ) : null}
                  {!colapsado ? cargasDoGrupo.map(renderLinhaCarga) : null}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Coluna direita: detalhe do cliente, expansível */}
      {detalheAberto ? (
        <div className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-l border-border p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-primary/10 text-primary">
              <User size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[16px] font-semibold text-text-primary">{cliente.nome}</h2>
                <button
                  type="button"
                  title="Editar cliente"
                  onClick={() => setEditandoContacto(true)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-text-tertiary transition-colors hover:bg-bg-app hover:text-text-primary"
                >
                  <Pencil size={13} />
                </button>
              </div>
              <TagPicker
                contactoId={cliente.id}
                etiquetasDoContacto={cliente.etiquetas}
                todasEtiquetas={todasEtiquetas}
                onChange={onDataChanged}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-1 text-[12px] text-text-secondary">
            {cliente.telefone ? (
              <span className="flex items-center gap-1.5">
                <Phone size={13} /> {cliente.telefone}
              </span>
            ) : null}
            {cliente.email ? (
              <span className="flex items-center gap-1.5">
                <Mail size={13} /> {cliente.email}
              </span>
            ) : null}
            {!cliente.telefone && !cliente.email ? <span className="text-text-tertiary">Sem contactos registados</span> : null}
          </div>

          {cliente.etiquetas.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {cliente.etiquetas.map((etiqueta) => (
                <span
                  key={etiqueta.id}
                  className="rounded-pill px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${etiqueta.cor} 16%, transparent)`,
                    color: etiqueta.cor,
                  }}
                >
                  {etiqueta.nome}
                </span>
              ))}
            </div>
          ) : null}

          {/* Histórico / totais */}
          <div className="mt-4 flex flex-col gap-1.5 rounded-control border border-border bg-bg-app px-3 py-2.5 text-[12px]">
            <div className="flex items-center justify-between text-text-secondary">
              Total <span className="font-medium text-text-primary">{formatValor(totalGeral, moeda)}</span>
            </div>
            <div className="flex items-center justify-between text-success">
              Pago <span className="font-medium">{formatValor(totalPago, moeda)}</span>
            </div>
            <div className={`flex items-center justify-between ${totalDevido > 0 ? 'text-warning' : 'text-text-tertiary'}`}>
              Devido <span className="font-medium">{formatValor(totalDevido, moeda)}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setFaturaOpen(true)}
              disabled={cargas.length === 0}
              className="flex h-9 items-center justify-center gap-1.5 rounded-control border border-border bg-bg-surface text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-app disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Receipt size={14} /> Gerar fatura
            </button>
            <BotaoEnviar
              temTelefone={Boolean(cliente.telefone)}
              temEmail={Boolean(cliente.email)}
              onClick={() => setEnvioAberto(true)}
            />
          </div>
        </div>
      ) : null}

      <ContactoFormModal
        open={editandoContacto}
        onClose={() => setEditandoContacto(false)}
        editingContacto={cliente}
        onSaved={() => {
          setEditandoContacto(false);
          onDataChanged();
        }}
      />

      <NovaCargaModal
        open={novaCargaOpen}
        onClose={() => {
          setNovaCargaOpen(false);
          setEditingCarga(null);
        }}
        contentoresAbertos={contentoresAbertos}
        defaultContentorId={contentorId}
        editingCarga={editingCarga}
        onSaved={() => {
          void carregar();
          onDataChanged();
        }}
      />

      <EnviarResumoModal
        open={envioAberto}
        onClose={() => setEnvioAberto(false)}
        contacto={cliente}
        contentorId={contentorId}
        cargas={cargas}
        onSent={onDataChanged}
      />

      <FaturaPreviewModal
        open={faturaOpen}
        onClose={() => setFaturaOpen(false)}
        cliente={{
          id: cliente.id,
          nome: cliente.nome,
          telefone: cliente.telefone,
          email: cliente.email,
        }}
        cargas={cargas}
        contentorId={escopoTodos ? undefined : (contentorId ?? undefined)}
      />

      <ConfirmDialog
        open={confirmarArquivarLote}
        title="Arquivar Cargas"
        message={`Tens a certeza que queres arquivar ${selecionados.size} carga(s)? Ficam fora das listagens, o histórico não se perde.`}
        tone="danger"
        confirmLabel="Arquivar"
        onConfirm={() => void handleArquivarSelecionadas()}
        onCancel={() => setConfirmarArquivarLote(false)}
      />

      {renderMenu()}
    </div>
  );
}
