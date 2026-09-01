import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';
import { toast } from '@/components/ui/Toast';
import { listContentoresDisponiveis, listMinhasCargasPendentes } from '@/lib/data';
import type { CargaPendente, ContentorDisponivel, EstadoCargaPendente } from '@/types';

const ESTADO_LABEL: Record<EstadoCargaPendente, string> = { pendente: 'Pendente', importada: 'Importada', rejeitada: 'Rejeitada' };
const ESTADO_ICONE: Record<EstadoCargaPendente, string> = { pendente: '⏳', importada: '✅', rejeitada: '⚠️' };
const ESTADO_CLASS: Record<EstadoCargaPendente, string> = {
  pendente: 'text-warning',
  importada: 'text-success',
  rejeitada: 'text-error',
};

const OPCOES_FILTRO: (EstadoCargaPendente | 'todas')[] = ['todas', 'pendente', 'importada', 'rejeitada'];

function formatMoeda(valor: number | null): string {
  if (valor == null) return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor);
}

function FiltroEstadoButton({
  filtro,
  onChange,
}: {
  filtro: EstadoCargaPendente | 'todas';
  onChange: (f: EstadoCargaPendente | 'todas') => void;
}): React.JSX.Element {
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
  const [contentores, setContentores] = useState<ContentorDisponivel[]>([]);
  const [cargas, setCargas] = useState<CargaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<EstadoCargaPendente | 'todas'>('todas');

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

  const filtradas = filtro === 'todas' ? cargas : cargas.filter((c) => c.estado === filtro);

  const grupos = useMemo(() => {
    const mapa = new Map<string, CargaPendente[]>();
    for (const c of filtradas) {
      const lista = mapa.get(c.emissorNome) ?? [];
      lista.push(c);
      mapa.set(c.emissorNome, lista);
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtradas]);

  function handleReenviar(c: CargaPendente): void {
    abrir({
      contentorId: c.contentorId,
      emissorNome: c.emissorNome,
      emissorTelefone: c.emissorTelefone,
      emissorEmail: c.emissorEmail,
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
    });
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
              {itens.map((c) => {
                const contentor = contentores.find((ct) => ct.id === c.contentorId);
                const podeReenviar = c.estado === 'rejeitada';
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!podeReenviar}
                    onClick={() => podeReenviar && handleReenviar(c)}
                    className="flex min-h-touch flex-col gap-0.5 border-b border-border py-2 text-left last:border-b-0 disabled:cursor-default"
                  >
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[14px] text-text-primary">{c.nomeCarga}</span>
                      <span className="shrink-0 text-[13px] tabular-nums text-text-secondary">{formatMoeda(c.valor)}</span>
                      <span className={`shrink-0 text-[12px] font-medium ${ESTADO_CLASS[c.estado]}`}>
                        {ESTADO_ICONE[c.estado]} {ESTADO_LABEL[c.estado]}
                      </span>
                    </div>
                    {contentor ? <span className="text-[11px] text-text-tertiary">{contentor.codigo}</span> : null}
                    {c.estado === 'rejeitada' && c.motivoRejeicao ? (
                      <span className="text-[12px] text-error">Motivo: {c.motivoRejeicao} · toca para reenviar corrigida</span>
                    ) : null}
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
