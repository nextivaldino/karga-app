import { useEffect, useMemo, useState } from 'react';
import { Warning as AlertTriangle, CheckCircle as CheckCircle2, ChatCircle as MessageCircle, ShieldCheck, XCircle } from '@phosphor-icons/react';
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

interface SincronizacaoViewProps {
  // Histórico agora é controlado pela barra "pro" da página Sync (o
  // botão vive lá, no tom amarelo mais claro) — este componente só
  // recebe o estado já pronto para desenhar o painel.
  historicoAberto: boolean;
  historico: CargaPendente[] | null;
  historicoLoading: boolean;
}

export function SincronizacaoView({ historicoAberto, historico, historicoLoading }: SincronizacaoViewProps): React.JSX.Element {
  const avatarPorUsuario = useAvatarPorUsuario();
  const [revisao, setRevisao] = useState<RevisaoCargaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [revisandoId, setRevisandoId] = useState<string | null>(null);
  const [rejeitarEmMassaAberto, setRejeitarEmMassaAberto] = useState(false);
  const [rejeitandoEmMassa, setRejeitandoEmMassa] = useState(false);
  const [conversaCom, setConversaCom] = useState<{ id: string; name: string } | null>(null);

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

  useEffect(() => {
    void carregar();
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
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[15px] font-semibold text-text-primary">Cargas Pendentes de Revisão (PWA)</h2>

      {historicoAberto ? (
        <div className="flex flex-col gap-2 rounded-control border border-border bg-bg-app p-3">
          {historicoLoading ? (
            <p className="text-[13px] text-text-tertiary">A carregar...</p>
          ) : !historico || historico.length === 0 ? (
            <p className="text-[13px] text-text-tertiary">Ainda não há cargas revistas.</p>
          ) : (
            historico.map((p, i) => (
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
            ))
          )}
        </div>
      ) : null}

      {erro ? (
        <p className="text-[13px] text-error">{erro}</p>
      ) : loading ? (
        <p className="text-[13px] text-text-tertiary">A carregar...</p>
      ) : revisao.length === 0 ? (
        <p className="text-[13px] text-text-tertiary">Não há cargas pendentes de revisão.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-control border border-border bg-bg-app px-3 py-2.5">
            <label className="flex items-center gap-2 text-[13px] text-text-primary">
              <input
                type="checkbox"
                checked={todasSelecionadas}
                ref={(el) => {
                  if (el) el.indeterminate = algumasSelecionadas;
                }}
                onChange={selecionarTodas}
              />
              Selecionar todas
            </label>
            <span className="text-[12px] text-text-tertiary">
              {totalSelecionadas} de {revisao.length} selecionadas
            </span>
            <button
              type="button"
              onClick={selecionarSemConflito}
              className="flex items-center gap-1.5 rounded-control px-2.5 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-primary-light"
            >
              <ShieldCheck size={13} /> Selecionar só sem conflito
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                disabled={totalSelecionadas === 0}
                onClick={() => setRejeitarEmMassaAberto(true)}
                className="rounded-control px-3 py-1.5 text-[12px] font-medium text-error transition-colors hover:bg-error/10 disabled:opacity-40"
              >
                Rejeitar selecionadas ({totalSelecionadas})
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {[...porUtilizador.entries()].map(([userId, grupo]) => (
              <div key={userId} className="rounded-surface border border-border bg-bg-surface">
                <div className="flex items-center gap-2 border-b border-border px-4 py-2">
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
        </>
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
