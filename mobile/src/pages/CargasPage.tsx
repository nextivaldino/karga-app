import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { toast } from '@/components/ui/Toast';
import { listContentoresDisponiveis, listMinhasCargasPendentes } from '@/lib/data';
import type { CargaPendente, ContentorDisponivel, EstadoCargaPendente, EstadoItemFila, NovaCargaPendenteInput } from '@/types';

type EstadoListaCarga = EstadoCargaPendente | EstadoItemFila;
type FiltroEstado = EstadoCargaPendente | 'todas';

interface LinhaCarga {
  id: string;
  nomeCarga: string;
  emissorNome: string;
  recetorNome: string;
  valor: number | null;
  estado: EstadoListaCarga;
  contentorId: string;
  motivoRejeicao: string | null;
  ultimoErro: string | null;
  prefill: NovaCargaPendenteInput;
  filaId: string | null;
}

const ESTADO_LABEL: Record<EstadoListaCarga, string> = {
  pendente: 'Pendente',
  importada: 'Importada',
  rejeitada: 'Rejeitada',
  fila: 'Por enviar',
  erro: 'Erro',
};
const ESTADO_ICONE: Record<EstadoListaCarga, string> = {
  pendente: '⏳',
  importada: '✅',
  rejeitada: '⚠️',
  fila: '⏳',
  erro: '⚠️',
};
const ESTADO_CLASS: Record<EstadoListaCarga, string> = {
  pendente: 'text-warning',
  importada: 'text-success',
  rejeitada: 'text-error',
  fila: 'text-text-tertiary',
  erro: 'text-error',
};

const OPCOES_FILTRO: FiltroEstado[] = ['todas', 'pendente', 'importada', 'rejeitada'];

function formatMoeda(valor: number | null): string {
  if (valor == null) return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor);
}

function prefillDe(c: CargaPendente): NovaCargaPendenteInput {
  return {
    contentorId: c.contentorId,
    emissorNome: c.emissorNome,
    emissorTelefone: c.emissorTelefone,
    emissorEmail: c.emissorEmail,
    emissorNif: c.emissorNif,
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
  };
}

function FiltroEstadoButton({ filtro, onChange }: { filtro: FiltroEstado; onChange: (f: FiltroEstado) => void }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const label = filtro === 'todas' ? 'Todas' : ESTADO_LABEL[filtro];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-touch items-center gap-1.5 rounded-control border border-border bg-bg-surface px-3 text-[13px] font-medium text-text-primary"
      >
        Estado: {label} <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="absolute left-0 top-11 z-30 w-40 overflow-hidden rounded-control border border-border bg-bg-surface shadow-lg">
          {OPCOES_FILTRO.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => {
                onChange(op);
                setOpen(false);
              }}
              className={`flex min-h-touch w-full items-center px-3 text-left text-[13px] ${
                filtro === op ? 'bg-primary/10 text-primary' : 'text-text-primary active:bg-bg-app'
              }`}
            >
              {op === 'todas' ? 'Todas' : ESTADO_LABEL[op]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CargasPage(): React.JSX.Element {
  const { abrir } = useNovaCargaOverlay();
  const { fila, removerItem, processarFila } = useFilaOffline();
  const [contentores, setContentores] = useState<ContentorDisponivel[]>([]);
  const [cargas, setCargas] = useState<CargaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroEstado>('todas');

  useEffect(() => {
    listContentoresDisponiveis()
      .then(setContentores)
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Falha ao carregar contentores.'));
  }, []);

  useEffect(() => {
    setLoading(true);
    listMinhasCargasPendentes()
      .then(setCargas)
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Falha ao carregar cargas.'))
      .finally(() => setLoading(false));
  }, []);

  const linhas = useMemo<LinhaCarga[]>(() => {
    const doServidor: LinhaCarga[] = cargas.map((c) => ({
      id: c.id,
      nomeCarga: c.nomeCarga,
      emissorNome: c.emissorNome,
      recetorNome: c.recetorNome,
      valor: c.valor,
      estado: c.estado,
      contentorId: c.contentorId,
      motivoRejeicao: c.motivoRejeicao,
      ultimoErro: null,
      prefill: prefillDe(c),
      filaId: null,
    }));
    const daFila: LinhaCarga[] = fila.map((f) => ({
      id: f.id,
      nomeCarga: f.item.nomeCarga,
      emissorNome: f.item.emissorNome,
      recetorNome: f.item.recetorNome,
      valor: f.item.valor,
      estado: f.estado,
      contentorId: f.item.contentorId,
      motivoRejeicao: null,
      ultimoErro: f.ultimoErro,
      prefill: f.item,
      filaId: f.id,
    }));
    return [...daFila, ...doServidor];
  }, [cargas, fila]);

  const filtradas = filtro === 'todas' ? linhas : linhas.filter((l) => l.estado === filtro);

  const grupos = useMemo(() => {
    const mapa = new Map<string, LinhaCarga[]>();
    for (const l of filtradas) {
      const lista = mapa.get(l.emissorNome) ?? [];
      lista.push(l);
      mapa.set(l.emissorNome, lista);
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtradas]);

  async function handleLinhaClick(l: LinhaCarga): Promise<void> {
    if (l.estado === 'erro' && l.filaId) {
      // Tentativa rápida de reenviar tal-e-qual antes de abrir para editar.
      await processarFila();
      return;
    }
    if (l.estado === 'fila' || l.estado === 'rejeitada') {
      if (l.filaId) await removerItem(l.filaId);
      abrir(l.prefill);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold text-text-primary">Cargas</h1>
        <FiltroEstadoButton filtro={filtro} onChange={setFiltro} />
      </div>

      {loading ? (
        <p className="text-[14px] text-text-tertiary">A carregar...</p>
      ) : grupos.length === 0 ? (
        <p className="text-[14px] text-text-tertiary">Nenhuma carga aqui.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {grupos.map(([emissor, itens]) => (
            <div key={emissor} className="flex flex-col">
              <div className="flex items-center gap-2 border-b border-border pb-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">{emissor}</span>
              </div>
              {itens.map((l) => {
                const contentor = contentores.find((ct) => ct.id === l.contentorId);
                const tocavel = l.estado === 'rejeitada' || l.estado === 'fila' || l.estado === 'erro';
                return (
                  <button
                    key={l.id}
                    type="button"
                    disabled={!tocavel}
                    onClick={() => void handleLinhaClick(l)}
                    className="flex min-h-touch flex-col gap-0.5 border-b border-border py-2 text-left last:border-b-0 disabled:cursor-default"
                  >
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[14px] text-text-primary">{l.nomeCarga}</span>
                      <span className="shrink-0 text-[13px] tabular-nums text-text-secondary">{formatMoeda(l.valor)}</span>
                      <span className={`shrink-0 text-[12px] font-medium ${ESTADO_CLASS[l.estado]}`}>
                        {ESTADO_ICONE[l.estado]} {ESTADO_LABEL[l.estado]}
                      </span>
                    </div>
                    {contentor ? <span className="text-[11px] text-text-tertiary">{contentor.codigo}</span> : null}
                    {l.estado === 'rejeitada' && l.motivoRejeicao ? (
                      <span className="text-[12px] text-error">Motivo: {l.motivoRejeicao} · toca para reenviar corrigida</span>
                    ) : null}
                    {l.estado === 'erro' && l.ultimoErro ? (
                      <span className="text-[12px] text-error">{l.ultimoErro} · toca para tentar novamente</span>
                    ) : null}
                    {l.estado === 'fila' ? <span className="text-[12px] text-text-tertiary">Toca para editar</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
