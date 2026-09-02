import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, FoldVertical, Mail, MessageCircle, Pencil, Send, Share2, Trash2, UnfoldVertical, UserRound } from 'lucide-react';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { useTopBarSlot } from '@/hooks/useTopBarSlot';
import { toast } from '@/components/ui/Toast';
import { listContentoresDisponiveis, listMinhasCargasPendentes } from '@/lib/data';
import { ESTADO_CLASS, ESTADO_ICON, ESTADO_LABEL, formatMoeda, type EstadoListaCarga } from '@/lib/cargaEstado';
import { corAcento, corAcentoEscura } from '@/lib/rowAccents';
import { CargaListHeader, CargaListRow, LARGURA_ACAO, LARGURA_VALOR, type AcaoLinhaCarga, type CargaListRowData } from '@/components/CargaListRow';
import type { CargaPendente, ContentorDisponivel, EstadoCargaPendente, NovaCargaPendenteInput } from '@/types';

type FiltroEstado = EstadoCargaPendente | 'todas';

interface LinhaCarga extends CargaListRowData {
  prefill: NovaCargaPendenteInput;
  filaId: string | null;
}

interface GrupoEmissor {
  chave: string;
  label: string;
  itens: LinhaCarga[];
}

const OPCOES_FILTRO: FiltroEstado[] = ['todas', 'pendente', 'importada', 'rejeitada'];

// Prioridade de "o que precisa de atenção primeiro" — o resumo do
// contacto mostra o ícone do estado mais urgente entre as suas cargas.
const PRIORIDADE_ESTADO: EstadoListaCarga[] = ['erro', 'rejeitada', 'fila', 'pendente', 'importada'];

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

function estadoDominante(itens: LinhaCarga[]): EstadoListaCarga {
  for (const estado of PRIORIDADE_ESTADO) {
    if (itens.some((i) => i.estado === estado)) return estado;
  }
  return 'importada';
}

function precisaAtencao(itens: LinhaCarga[]): boolean {
  return itens.some((i) => i.estado === 'fila' || i.estado === 'erro' || i.estado === 'rejeitada');
}

function contactoDoGrupo(itens: LinhaCarga[]): { telefone: string | null; email: string | null } {
  const comTelefone = itens.find((i) => i.prefill.emissorTelefone?.trim());
  const comEmail = itens.find((i) => i.prefill.emissorEmail?.trim());
  return { telefone: comTelefone?.prefill.emissorTelefone ?? null, email: comEmail?.prefill.emissorEmail ?? null };
}

function abrirWhatsapp(telefone: string): void {
  const digitos = telefone.replace(/[^0-9]/g, '');
  window.open(`https://wa.me/${digitos}`, '_blank');
}

function abrirEmail(email: string): void {
  window.open(`mailto:${email}?subject=${encodeURIComponent('Kraga — as suas cargas')}`, '_blank');
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

// Botão único de "enviar" — largura fixa sempre presente (mesmo sem
// contacto, só que apagado), para o Valor alinhar sempre na mesma
// posição em todas as linhas. Ao clicar, revela WhatsApp/Email conforme
// o que esse emissor tiver guardado.
function BotaoEnviarContacto({ telefone, email }: { telefone: string | null; email: string | null }): React.JSX.Element {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const disponivel = Boolean(telefone || email);

  useEffect(() => {
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative flex h-9 ${LARGURA_ACAO} shrink-0 items-center justify-center`}>
      <button
        type="button"
        disabled={!disponivel}
        onClick={(e) => {
          e.stopPropagation();
          setAberto((v) => !v);
        }}
        title="Enviar para o contacto"
        className={`flex h-9 w-9 items-center justify-center rounded-control ${
          disponivel ? 'text-text-secondary active:bg-bg-app' : 'text-text-tertiary opacity-30'
        }`}
      >
        <Share2 size={17} />
      </button>
      {aberto ? (
        <div className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-control border border-border bg-bg-surface shadow-lg">
          {telefone ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAberto(false);
                abrirWhatsapp(telefone);
              }}
              className="flex min-h-touch w-full items-center gap-2 px-3 text-left text-[13px] text-text-primary active:bg-bg-app"
            >
              <MessageCircle size={16} className="text-success" /> WhatsApp
            </button>
          ) : null}
          {email ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAberto(false);
                abrirEmail(email);
              }}
              className={`flex min-h-touch w-full items-center gap-2 px-3 text-left text-[13px] text-text-primary active:bg-bg-app ${telefone ? 'border-t border-border' : ''}`}
            >
              <Mail size={16} className="text-primary" /> Email
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Cabeçalho de um contacto — mostra o resumo (nº de cargas, valor total,
// estado mais urgente) e funciona como o gatilho para expandir/colapsar
// a lista de cargas desse emissor, ao estilo "lista de contactos".
function GrupoContactoHeader({
  grupo,
  cor,
  corTexto,
  expandido,
  onToggle,
}: {
  grupo: GrupoEmissor;
  cor: string;
  corTexto: string;
  expandido: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  const totalValor = grupo.itens.reduce((soma, i) => soma + (i.valor ?? 0), 0);
  const estado = estadoDominante(grupo.itens);
  const EstadoIcon = ESTADO_ICON[estado];
  const contacto = contactoDoGrupo(grupo.itens);

  return (
    <div
      className="relative z-10 flex w-full items-center gap-2 px-4 py-3"
      style={{ backgroundColor: `${cor}26`, borderLeft: `3px solid ${cor}` }}
    >
      <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <ChevronDown size={18} className={`shrink-0 transition-transform ${expandido ? 'rotate-180' : ''}`} style={{ color: corTexto }} />
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${cor}33`, color: corTexto }}>
          <UserRound size={13} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-text-primary">{grupo.label}</span>
        <span className="shrink-0 text-[11px] font-medium text-text-secondary">
          {grupo.itens.length} {grupo.itens.length === 1 ? 'carga' : 'cargas'}
        </span>
        <EstadoIcon size={14} className={`shrink-0 ${ESTADO_CLASS[estado]}`} aria-label={ESTADO_LABEL[estado]} />
      </button>
      <span className={`${LARGURA_VALOR} shrink-0 text-right text-[13px] font-bold tabular-nums text-text-primary`}>{formatMoeda(totalValor)}</span>
      <BotaoEnviarContacto telefone={contacto.telefone} email={contacto.email} />
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
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const seedFeita = useRef(false);

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

  // Agrupado por contacto (emissor) — cada um ganha uma cor própria e
  // estável, e funciona como uma entrada de "lista de contactos": o
  // cabeçalho mostra o resumo, expandir revela as cargas desse contacto.
  const grupos = useMemo<GrupoEmissor[]>(() => {
    const mapa = new Map<string, GrupoEmissor>();
    for (const l of filtradas) {
      const chave = l.emissorNome.trim().toLowerCase();
      const grupo = mapa.get(chave) ?? { chave, label: tituloCase(l.emissorNome), itens: [] };
      grupo.itens.push(l);
      mapa.set(chave, grupo);
    }
    return [...mapa.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [filtradas]);

  // Por omissão, só os contactos com algo por resolver começam expandidos
  // — os já sincronizados ficam recolhidos para poupar espaço. Só corre
  // uma vez, depois disso a escolha é sempre do utilizador.
  useEffect(() => {
    if (seedFeita.current || loading || grupos.length === 0) return;
    seedFeita.current = true;
    setExpandidos(new Set(grupos.filter((g) => precisaAtencao(g.itens)).map((g) => g.chave)));
  }, [grupos, loading]);

  const todosExpandidos = grupos.length > 0 && grupos.every((g) => expandidos.has(g.chave));

  function alternarTodos(): void {
    setExpandidos(todosExpandidos ? new Set() : new Set(grupos.map((g) => g.chave)));
  }

  function alternarGrupo(chave: string): void {
    setExpandidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

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

  useTopBarSlot(
    <>
      <span className="shrink-0 text-[16px] font-semibold text-text-primary">Cargas</span>
      <button
        type="button"
        onClick={alternarTodos}
        title={todosExpandidos ? 'Colapsar todos' : 'Expandir todos'}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-text-secondary active:bg-bg-app"
      >
        {todosExpandidos ? <FoldVertical size={16} /> : <UnfoldVertical size={16} />}
      </button>
      <FiltroEstadoButton filtro={filtro} onChange={setFiltro} />
    </>,
  );

  return (
    <div className="flex flex-col gap-3 py-4">
      {loading ? (
        <p className="px-4 text-[14px] text-text-tertiary">A carregar...</p>
      ) : grupos.length === 0 ? (
        <p className="px-4 text-[14px] text-text-tertiary">Nenhuma carga aqui.</p>
      ) : (
        <div className="flex flex-col">
          <CargaListHeader />
          {grupos.map((grupo, grupoIndex) => {
            const cor = corAcento(grupoIndex);
            const corTexto = corAcentoEscura(grupoIndex);
            const expandido = expandidos.has(grupo.chave);
            return (
              <div key={grupo.chave} className="flex flex-col">
                <GrupoContactoHeader grupo={grupo} cor={cor} corTexto={corTexto} expandido={expandido} onToggle={() => alternarGrupo(grupo.chave)} />
                {expandido
                  ? grupo.itens.map((l) => <CargaListRow key={l.id} linha={l} corGrupo={cor} acoes={acoesPara(l)} />)
                  : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
