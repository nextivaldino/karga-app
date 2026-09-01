import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { HeaderBarModal } from '@/components/ui/HeaderBarModal';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import { RevisarCargaPendenteModal } from './RevisarCargaPendenteModal';
import type { RevisaoCargaPendente } from '@/types';

function formatData(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

function temConflito(r: RevisaoCargaPendente): boolean {
  return r.sugestoes.some((s) => s.sugestaoId != null && !s.automatico);
}

interface Progresso {
  done: number;
  total: number;
  falhas: { nome: string; erro: string }[];
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

export function SincronizacaoView(): React.JSX.Element {
  const [revisao, setRevisao] = useState<RevisaoCargaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [revisandoId, setRevisandoId] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const [rejeitarEmMassaAberto, setRejeitarEmMassaAberto] = useState(false);
  const [rejeitandoEmMassa, setRejeitandoEmMassa] = useState(false);

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

  async function handleImportarSelecionadas(): Promise<void> {
    const itens = revisao.filter((r) => selecionados.has(r.pendente.id));
    if (itens.length === 0) return;

    setProgresso({ done: 0, total: itens.length, falhas: [] });
    const falhas: { nome: string; erro: string }[] = [];

    for (const r of itens) {
      const sugEmissor = r.sugestoes.find((s) => s.campo === 'emissor');
      const sugRecetor = r.sugestoes.find((s) => s.campo === 'recetor');
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
        });
      } catch (err) {
        falhas.push({ nome: r.pendente.nomeCarga, erro: cleanIpcError(err) });
      }
      setProgresso((p) => (p ? { ...p, done: p.done + 1, falhas } : p));
    }

    const sucesso = itens.length - falhas.length;
    if (falhas.length === 0) {
      toast.success(`${sucesso} carga${sucesso === 1 ? '' : 's'} importada${sucesso === 1 ? '' : 's'}.`);
    } else {
      toast.warning(`${sucesso} importada${sucesso === 1 ? '' : 's'}, ${falhas.length} falharam.`);
    }
    setProgresso(null);
    void carregar();
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
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-text-primary">Cargas Pendentes de Revisão (PWA)</h2>
        <button
          type="button"
          onClick={() => void carregar()}
          className="flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-app"
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

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
                disabled={totalSelecionadas === 0 || progresso != null}
                onClick={() => setRejeitarEmMassaAberto(true)}
                className="rounded-control px-3 py-1.5 text-[12px] font-medium text-error transition-colors hover:bg-error/10 disabled:opacity-40"
              >
                Rejeitar selecionadas ({totalSelecionadas})
              </button>
              <button
                type="button"
                disabled={totalSelecionadas === 0 || progresso != null}
                onClick={() => void handleImportarSelecionadas()}
                className="rounded-control bg-primary px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
              >
                Importar selecionadas ({totalSelecionadas})
              </button>
            </div>
          </div>

          {progresso ? (
            <ProgressBar
              value={progresso.done}
              max={progresso.total}
              label={`A importar ${progresso.done} de ${progresso.total}...${progresso.falhas.length > 0 ? ` (${progresso.falhas.length} falhas)` : ''}`}
            />
          ) : null}

          <div className="flex flex-col gap-4">
            {[...porUtilizador.entries()].map(([userId, grupo]) => (
              <div key={userId} className="rounded-surface border border-border bg-bg-surface">
                <div className="border-b border-border px-4 py-2">
                  <span className="text-[13px] font-medium text-text-primary">{grupo.nome}</span>
                  <span className="ml-2 text-[12px] text-text-tertiary">
                    {grupo.itens.length} carga{grupo.itens.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex flex-col">
                  {grupo.itens.map((r) => {
                    const p = r.pendente;
                    const conflito = temConflito(r);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
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
    </div>
  );
}
