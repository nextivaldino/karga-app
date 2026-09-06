import { useEffect, useMemo, useState } from 'react';
import {
  Warning as AlertTriangle,
  CheckCircle as CheckCircle2,
  ChatCircle as MessageCircle,
  MagicWand,
  PencilSimple,
  ShieldCheck,
  XCircle,
} from '@phosphor-icons/react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { toast } from '@/components/ui/Toast';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import { useAvatarPorUsuario } from '@/hooks/useAvatarPorUsuario';
import { ROW_TINTS } from '@/modules/cargas/CargasList';
import { RevisarCargaPendenteModal } from './RevisarCargaPendenteModal';
import { MensagemComposerModal } from '@/modules/mensagens/MensagemComposerModal';
import type { CargaPendente, RevisaoCargaPendente } from '@/types';

type ModoCodigo = 'automatico' | 'manual';

function formatData(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

function temConflito(r: RevisaoCargaPendente): boolean {
  return r.sugestoes.some((s) => s.sugestaoId != null && !s.automatico);
}

interface RejeitarEmMassaModalProps {
  open: boolean;
  count: number;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}

function RejeitarEmMassaModal({ open, count, submitting, onClose, onConfirm }: RejeitarEmMassaModalProps): React.JSX.Element {
  const [motivo, setMotivo] = useState('');

  return (
    <HeaderBarModal
      open={open}
      onClose={onClose}
      title={`Rejeitar ${count} carga${count === 1 ? '' : 's'}`}
      widthClassName="max-w-[440px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-control px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={submitting || !motivo.trim()}
            onClick={() => onConfirm(motivo.trim())}
            className="rounded-control bg-error px-4 py-2 text-[13px] font-medium text-white transition-colors hover:brightness-95 disabled:opacity-60"
          >
            {submitting ? 'A rejeitar...' : 'Confirmar Rejeição'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-text-secondary">
          O mesmo motivo é aplicado às {count} carga{count === 1 ? '' : 's'} selecionada{count === 1 ? '' : 's'}.
        </p>
        <FloatingLabelInput as="textarea" label="Motivo da rejeição" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </div>
    </HeaderBarModal>
  );
}

// A quantas entradas o histórico fica limitado por defeito — só o
// suficiente para confirmar "sim, entrou" sem exigir um clique extra;
// "Ver histórico completo" troca para HISTORICO_LIMITE_TOTAL.
const HISTORICO_LIMITE_CURTO = 5;
const HISTORICO_LIMITE_TOTAL = 100;

export function SincronizacaoView(): React.JSX.Element {
  const avatarPorUsuario = useAvatarPorUsuario();
  const [revisao, setRevisao] = useState<RevisaoCargaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  // Últimas cargas sincronizadas (ou rejeitadas) — sempre visível, sem
  // precisar de abrir nada, com a opção de ver a lista completa.
  const [historico, setHistorico] = useState<CargaPendente[] | null>(null);
  const [historicoLoading, setHistoricoLoading] = useState(true);
  const [historicoCompleto, setHistoricoCompleto] = useState(false);
  const [revisandoId, setRevisandoId] = useState<string | null>(null);
  const [rejeitarEmMassaAberto, setRejeitarEmMassaAberto] = useState(false);
  const [rejeitandoEmMassa, setRejeitandoEmMassa] = useState(false);
  const [conversaCom, setConversaCom] = useState<{ id: string; name: string } | null>(null);

  // Código das cargas ao importar em massa — automático (padrão, igual ao
  // que já acontecia) ou um valor à mão por carga. Só aparece a coluna
  // extra quando o Admin escolhe "Manual".
  const [modoCodigo, setModoCodigo] = useState<ModoCodigo>('automatico');
  const [codigosManuais, setCodigosManuais] = useState<Record<string, string>>({});
  const [importandoSelecionadas, setImportandoSelecionadas] = useState(false);

  async function carregar(): Promise<void> {
    setLoading(true);
    setErro(null);
    try {
      const dados = await ipcService.sync.listPendentesComSugestoes();
      setRevisao(dados);
      setSelecionados((atual) => {
        const idsValidos = new Set(dados.map((r) => r.pendente.id));
        return new Set([...atual].filter((id) => idsValidos.has(id)));
      });
    } catch (err) {
      setErro(cleanIpcError(err));
    } finally {
      setLoading(false);
    }
  }

  async function carregarHistorico(completo: boolean): Promise<void> {
    setHistoricoLoading(true);
    try {
      const dados = await ipcService.sync.listarHistorico(completo ? HISTORICO_LIMITE_TOTAL : HISTORICO_LIMITE_CURTO);
      setHistorico(dados);
      setHistoricoCompleto(completo);
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setHistoricoLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
    void carregarHistorico(false);
  }, []);

  const porUtilizador = useMemo(() => {
    const mapa = new Map<string, { nome: string; itens: RevisaoCargaPendente[] }>();
    for (const r of revisao) {
      const atual = mapa.get(r.pendente.inseridoPorUserId) ?? { nome: r.pendente.inseridoPorNome, itens: [] };
      atual.itens.push(r);
      mapa.set(r.pendente.inseridoPorUserId, atual);
    }
    return mapa;
  }, [revisao]);

  const totalSelecionadas = selecionados.size;
  const todasSelecionadas = revisao.length > 0 && totalSelecionadas === revisao.length;
  const algumasSelecionadas = totalSelecionadas > 0 && !todasSelecionadas;

  function toggleSelecionado(id: string): void {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function selecionarTodas(): void {
    setSelecionados(todasSelecionadas ? new Set() : new Set(revisao.map((r) => r.pendente.id)));
  }

  function selecionarSemConflito(): void {
    setSelecionados(new Set(revisao.filter((r) => !temConflito(r)).map((r) => r.pendente.id)));
  }

  function codigoPrevisto(pendenteId: string): string | null {
    if (modoCodigo === 'manual') return codigosManuais[pendenteId] ?? '';
    return null;
  }

  async function handleImportarSelecionadas(): Promise<void> {
    const selecionadosSemConflito = revisao.filter((r) => selecionados.has(r.pendente.id) && !temConflito(r));
    const ignoradosPorConflito = totalSelecionadas - selecionadosSemConflito.length;
    if (selecionadosSemConflito.length === 0) {
      toast.error('Nenhuma carga sem conflito selecionada — usa "Rever" nas que têm conflito.');
      return;
    }

    setImportandoSelecionadas(true);
    let importadas = 0;
    let falhas = 0;
    for (const r of selecionadosSemConflito) {
      const sugEmissor = r.sugestoes.find((s) => s.campo === 'emissor');
      const sugRecetor = r.sugestoes.find((s) => s.campo === 'recetor');
      const codigo = codigoPrevisto(r.pendente.id)?.trim() || undefined;
      try {
        await ipcService.sync.importarCarga({
          pendenteId: r.pendente.id,
          contentorId: r.pendente.contentorId,
          emissorId: sugEmissor?.sugestaoId ?? null,
          recetorId: sugRecetor?.sugestaoId ?? null,
          nome: r.pendente.nomeCarga,
          comprimentoCm: r.pendente.comprimentoCm,
          larguraCm: r.pendente.larguraCm,
          alturaCm: r.pendente.alturaCm,
          pesoKg: r.pendente.pesoKg,
          valor: r.pendente.valor,
          pago: r.pendente.pago,
          codigo,
        });
        importadas += 1;
      } catch (err) {
        falhas += 1;
        toast.error(`${r.pendente.nomeCarga}: ${cleanIpcError(err)}`);
      }
    }
    setImportandoSelecionadas(false);
    setSelecionados(new Set());
    setCodigosManuais({});

    if (falhas === 0) {
      toast.success(`${importadas} carga${importadas === 1 ? '' : 's'} importada${importadas === 1 ? '' : 's'}.`);
    } else {
      toast.warning(`${importadas} importada${importadas === 1 ? '' : 's'}, ${falhas} falharam.`);
    }
    if (ignoradosPorConflito > 0) {
      toast.info(`${ignoradosPorConflito} com conflito ficaram por importar — usa "Rever" para essas.`);
    }
    void carregar();
    void carregarHistorico(historicoCompleto);
  }

  async function handleRejeitarSelecionadas(motivo: string): Promise<void> {
    const itens = revisao.filter((r) => selecionados.has(r.pendente.id));
    if (itens.length === 0) return;

    setRejeitandoEmMassa(true);
    let falhas = 0;
    for (const r of itens) {
      try {
        await ipcService.sync.rejeitarCarga(r.pendente.id, motivo);
      } catch {
        falhas += 1;
      }
    }
    setRejeitandoEmMassa(false);
    setRejeitarEmMassaAberto(false);

    const sucesso = itens.length - falhas;
    if (falhas === 0) {
      toast.success(`${sucesso} carga${sucesso === 1 ? '' : 's'} rejeitada${sucesso === 1 ? '' : 's'}.`);
    } else {
      toast.warning(`${sucesso} rejeitadas, ${falhas} falharam.`);
    }
    void carregar();
    void carregarHistorico(historicoCompleto);
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[15px] font-semibold text-text-primary">Cargas Recebidas da Equipa em Campo</h2>

      <div className="flex flex-col gap-2 rounded-control border border-border bg-bg-app p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">
            Últimas Sincronizadas
          </h3>
          <button
            type="button"
            onClick={() => void carregarHistorico(!historicoCompleto)}
            className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
          >
            {historicoCompleto ? 'Ver só as últimas' : 'Ver histórico completo'}
          </button>
        </div>
        {historicoLoading ? (
          <p className="text-[13px] text-text-tertiary">A carregar...</p>
        ) : !historico || historico.length === 0 ? (
          <p className="text-[13px] text-text-tertiary">Ainda não há cargas revistas.</p>
        ) : (
          <div className="flex max-h-[360px] flex-col gap-1.5 overflow-y-auto">
            {historico.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-control px-2.5 py-2 text-[13px]"
                style={{ backgroundColor: `color-mix(in srgb, ${ROW_TINTS[i % ROW_TINTS.length]} 5%, var(--bg-surface))` }}
              >
                {p.estado === 'importada' ? (
                  <CheckCircle2 size={15} className="shrink-0 text-success" />
                ) : (
                  <XCircle size={15} className="shrink-0 text-error" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-text-primary">{p.nomeCarga}</p>
                  <p className="truncate text-[11px] text-text-tertiary">
                    {p.emissorNome} → {p.recetorNome} · {p.inseridoPorNome}
                    {p.estado === 'rejeitada' && p.motivoRejeicao ? ` · ${p.motivoRejeicao}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-text-tertiary">{formatData(p.importadoEm ?? p.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {erro ? (
        <p className="text-[13px] text-error">{erro}</p>
      ) : loading ? (
        <p className="text-[13px] text-text-tertiary">A carregar...</p>
      ) : revisao.length === 0 ? (
        <p className="text-[13px] text-text-tertiary">Não há cargas pendentes de revisão.</p>
      ) : (
        <div className="overflow-hidden rounded-surface border border-border bg-bg-surface">
          {/* Uma barra só, com tudo o que era antes duas — seleção,
              filtro rápido, modo de código e as ações em massa — para a
              página ficar mais compacta em vez de três blocos separados. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-bg-app px-3 py-2.5">
            <label className="flex items-center gap-2 text-[13px] text-text-primary">
              <input
                type="checkbox"
                checked={todasSelecionadas}
                ref={(el) => {
                  if (el) el.indeterminate = algumasSelecionadas;
                }}
                onChange={selecionarTodas}
              />
              Todas
            </label>
            <span className="text-[12px] text-text-tertiary">
              {totalSelecionadas} de {revisao.length}
            </span>
            <button
              type="button"
              onClick={selecionarSemConflito}
              className="flex items-center gap-1.5 rounded-control px-2.5 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-primary-light"
            >
              <ShieldCheck size={13} /> Só sem conflito
            </button>

            <div className="h-5 w-px shrink-0 bg-border" />

            <div className="flex items-center rounded-control border border-border bg-bg-surface p-0.5">
              {(
                [
                  { modo: 'automatico', label: 'Automático', icon: MagicWand },
                  { modo: 'manual', label: 'Manual', icon: PencilSimple },
                ] as const
              ).map(({ modo, label, icon: Icon }) => (
                <button
                  key={modo}
                  type="button"
                  onClick={() => setModoCodigo(modo)}
                  title={label}
                  className={`flex items-center gap-1.5 rounded-control px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    modoCodigo === modo ? 'bg-primary text-white' : 'text-text-secondary hover:bg-bg-app'
                  }`}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                disabled={totalSelecionadas === 0 || importandoSelecionadas}
                onClick={() => void handleImportarSelecionadas()}
                className="rounded-control bg-primary px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
              >
                {importandoSelecionadas ? 'A importar...' : `Importar (${totalSelecionadas})`}
              </button>
              <button
                type="button"
                disabled={totalSelecionadas === 0}
                onClick={() => setRejeitarEmMassaAberto(true)}
                className="rounded-control px-3 py-1.5 text-[12px] font-medium text-error transition-colors hover:bg-error/10 disabled:opacity-40"
              >
                Rejeitar ({totalSelecionadas})
              </button>
            </div>
          </div>

          <div className="flex flex-col">
            {[...porUtilizador.entries()].map(([userId, grupo], grupoIndex) => (
              <div key={userId} className={grupoIndex > 0 ? 'border-t border-border' : ''}>
                <div className="flex items-center gap-2 bg-bg-app/60 px-4 py-2">
                  <UserAvatar avatar={avatarPorUsuario.get(userId)} size={22} />
                  <button
                    type="button"
                    title="Enviar mensagem"
                    onClick={() => setConversaCom({ id: userId, name: grupo.nome })}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-text-primary hover:text-primary hover:underline"
                  >
                    <MessageCircle size={13} className="shrink-0 text-text-tertiary" />
                    {grupo.nome}
                  </button>
                  <span className="ml-2 text-[12px] text-text-tertiary">
                    {grupo.itens.length} carga{grupo.itens.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex flex-col">
                  {grupo.itens.map((r, i) => {
                    const p = r.pendente;
                    const conflito = temConflito(r);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                        style={{ backgroundColor: `color-mix(in srgb, ${ROW_TINTS[i % ROW_TINTS.length]} 5%, var(--bg-surface))` }}
                      >
                        <input
                          type="checkbox"
                          checked={selecionados.has(p.id)}
                          onChange={() => toggleSelecionado(p.id)}
                          className="shrink-0"
                        />
                        {modoCodigo === 'manual' ? (
                          <input
                            type="text"
                            value={codigosManuais[p.id] ?? ''}
                            onChange={(e) => setCodigosManuais((atual) => ({ ...atual, [p.id]: e.target.value }))}
                            disabled={conflito}
                            placeholder="Auto"
                            title={conflito ? 'Resolve o conflito em "Rever" primeiro' : 'Código desta carga'}
                            className="w-[92px] shrink-0 rounded-control border border-border bg-bg-input px-2 py-1 text-[12px] text-text-primary outline-none focus:border-primary disabled:opacity-40"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] text-text-primary">{p.nomeCarga}</span>
                            {conflito ? (
                              <span className="flex shrink-0 items-center gap-1 rounded-pill bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                                <AlertTriangle size={11} /> Conflito de contacto
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-[12px] text-text-tertiary">
                            {p.emissorNome} → {p.recetorNome}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-text-tertiary">{formatData(p.createdAt)}</span>
                        <button
                          type="button"
                          onClick={() => setRevisandoId(p.id)}
                          className="shrink-0 rounded-control px-2.5 py-1 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
                        >
                          Rever
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <RevisarCargaPendenteModal
        open={revisandoId != null}
        onClose={() => setRevisandoId(null)}
        pendenteId={revisandoId}
        onDone={() => void carregar()}
      />

      <RejeitarEmMassaModal
        open={rejeitarEmMassaAberto}
        count={totalSelecionadas}
        submitting={rejeitandoEmMassa}
        onClose={() => setRejeitarEmMassaAberto(false)}
        onConfirm={(motivo) => void handleRejeitarSelecionadas(motivo)}
      />

      <MensagemComposerModal open={conversaCom != null} onClose={() => setConversaCom(null)} utilizador={conversaCom} />
    </div>
  );
}
