import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Pencil, Send, Trash2 } from 'lucide-react';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { toast } from '@/components/ui/Toast';
import { listContentoresDisponiveis, listMinhasCargasPendentes } from '@/lib/data';
import { ESTADO_LABEL } from '@/lib/cargaEstado';
import { corAcento } from '@/lib/rowAccents';
import { CargaListHeader, CargaListRow, type AcaoLinhaCarga, type CargaListRowData } from '@/components/CargaListRow';
import type { CargaPendente, ContentorDisponivel, EstadoCargaPendente, NovaCargaPendenteInput } from '@/types';

type FiltroEstado = EstadoCargaPendente | 'todas';

interface LinhaCarga extends CargaListRowData {
  prefill: NovaCargaPendenteInput;
  filaId: string | null;
}

const OPCOES_FILTRO: FiltroEstado[] = ['todas', 'pendente', 'importada', 'rejeitada'];

function tituloCase(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .map((p) => (p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p))
    .join(' ');
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
        <div className="absolute right-0 top-11 z-30 w-40 overflow-hidden rounded-control border border-border bg-bg-surface shadow-lg">
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
    const codigoContentor = (contentorId: string): string => contentores.find((c) => c.id === contentorId)?.codigo ?? '—';
    const daFila: LinhaCarga[] = fila.map((f) => ({
      id: f.id,
      codigo: codigoContentor(f.item.contentorId),
      emissorNome: tituloCase(f.item.emissorNome),
      recetorNome: tituloCase(f.item.recetorNome),
      nomeCarga: f.item.nomeCarga,
      comprimentoCm: f.item.comprimentoCm,
      larguraCm: f.item.larguraCm,
      alturaCm: f.item.alturaCm,
      valor: f.item.valor,
      estado: f.estado,
      nota: f.estado === 'erro' && f.ultimoErro ? `${f.ultimoErro} · toca em enviar para tentar novamente` : null,
      prefill: f.item,
      filaId: f.id,
    }));
    const doServidor: LinhaCarga[] = cargas.map((c) => ({
      id: c.id,
      codigo: codigoContentor(c.contentorId),
      emissorNome: tituloCase(c.emissorNome),
      recetorNome: tituloCase(c.recetorNome),
      nomeCarga: c.nomeCarga,
      comprimentoCm: c.comprimentoCm,
      larguraCm: c.larguraCm,
      alturaCm: c.alturaCm,
      valor: c.valor,
      estado: c.estado,
      nota: c.estado === 'rejeitada' && c.motivoRejeicao ? `Motivo: ${c.motivoRejeicao}` : null,
      prefill: prefillDe(c),
      filaId: null,
    }));
    return [...daFila, ...doServidor];
  }, [cargas, fila, contentores]);

  const filtradas = filtro === 'todas' ? linhas : linhas.filter((l) => l.estado === filtro);

  // Agrupado por emissor — cada emissor ganha uma cor própria e estável
  // (mesma cor em todas as cargas dele), para se distinguir dos outros
  // grupos numa lista só de faixas coloridas à esquerda. Agrupa por nome
  // normalizado (maiúsculas/minúsculas não devem separar o mesmo emissor
  // em duas abas) e mostra sempre a versão em Title Case, consistente.
  const grupos = useMemo(() => {
    const mapa = new Map<string, { label: string; itens: LinhaCarga[] }>();
    for (const l of filtradas) {
      const chave = l.emissorNome.trim().toLowerCase();
      const grupo = mapa.get(chave) ?? { label: tituloCase(l.emissorNome), itens: [] };
      grupo.itens.push(l);
      mapa.set(chave, grupo);
    }
    return [...mapa.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [filtradas]);

  async function handleEditar(l: LinhaCarga): Promise<void> {
    if (l.filaId) await removerItem(l.filaId);
    abrir(l.prefill);
  }

  function acoesPara(l: LinhaCarga): AcaoLinhaCarga[] {
    if (l.estado === 'fila' || l.estado === 'erro') {
      return [
        { label: 'Enviar', icon: Send, onClick: () => void processarFila() },
        { label: 'Editar', icon: Pencil, onClick: () => void handleEditar(l) },
        { label: 'Eliminar', icon: Trash2, destrutiva: true, onClick: () => l.filaId && void removerItem(l.filaId) },
      ];
    }
    if (l.estado === 'rejeitada') {
      return [{ label: 'Editar', icon: Pencil, onClick: () => void handleEditar(l) }];
    }
    return [];
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex items-center justify-between px-4">
        <h1 className="text-[20px] font-semibold text-text-primary">Cargas</h1>
        <FiltroEstadoButton filtro={filtro} onChange={setFiltro} />
      </div>

      {loading ? (
        <p className="px-4 text-[14px] text-text-tertiary">A carregar...</p>
      ) : grupos.length === 0 ? (
        <p className="px-4 text-[14px] text-text-tertiary">Nenhuma carga aqui.</p>
      ) : (
        <div className="flex flex-col">
          <div className="px-4">
            <CargaListHeader />
          </div>
          {grupos.map(({ label, itens }, grupoIndex) => {
            const cor = corAcento(grupoIndex);
            return (
              <div key={label} className={grupoIndex > 0 ? 'mt-4 flex flex-col' : 'flex flex-col'}>
                <div
                  className="flex items-center justify-between gap-2 px-4 py-1.5"
                  style={{ backgroundColor: `${cor}26`, borderBottom: `2px solid ${cor}` }}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                    <span className="truncate text-[11px] font-semibold uppercase tracking-wide" style={{ color: cor }}>
                      {label}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-medium" style={{ color: cor }}>
                    {itens.length} {itens.length === 1 ? 'carga' : 'cargas'}
                  </span>
                </div>
                {itens.map((l) => (
                  <CargaListRow key={l.id} linha={l} corGrupo={cor} acoes={acoesPara(l)} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
