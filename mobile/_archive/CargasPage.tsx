import { useEffect, useRef, useState, useMemo } from 'react';
import { CaretDown as ChevronDown, ArrowsInLineVertical as FoldVertical, Package, PencilSimple as Pencil, PaperPlaneTilt as Send, Stack as Layers, Trash as Trash2, ArrowsOutLineVertical as UnfoldVertical } from '@phosphor-icons/react';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { useCargasToolbar } from '@/hooks/useCargasToolbar';
import { PullToRefresh } from '@/components/PullToRefresh';
import { ESTADO_CLASS, ESTADO_ICON, ESTADO_LABEL, formatMoeda, type EstadoListaCarga } from '@/lib/cargaEstado';
import { CargaListHeader, CargaListRow, LARGURA_VALOR, type AcaoLinhaCarga, type CargaListRowData } from '@/components/CargaListRow';
import type { CargaPendente, NovaCargaPendenteInput } from '@/types';

interface LinhaCarga extends CargaListRowData {
  prefill: NovaCargaPendenteInput;
  filaId: string | null;
}

interface GrupoContentor {
  contentorId: string;
  codigo: string;
  nome: string;
  itens: LinhaCarga[];
}

// Prioridade de "o que precisa de atenção primeiro" — o resumo do
// contentor mostra o ícone do estado mais urgente entre as suas cargas.
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
    emissorMorada: c.emissorMorada,
    recetorNome: c.recetorNome,
    recetorTelefone: c.recetorTelefone,
    recetorEmail: c.recetorEmail,
    recetorMorada: c.recetorMorada,
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

// Cabeçalho de um contentor — plano, sem fundo de cor: nome/código a
// preto, contentor como legenda cinza por baixo, contagem+valor à
// direita, disclosure chevron no fim. Resumo (nº de cargas, valor total,
// estado mais urgente) e gatilho para expandir/colapsar as suas cargas.
function GrupoContentorHeader({
  grupo,
  expandido,
  onToggle,
}: {
  grupo: GrupoContentor;
  expandido: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  const totalValor = grupo.itens.reduce((soma, i) => soma + (i.valor ?? 0), 0);
  const estado = estadoDominante(grupo.itens);
  const EstadoIcon = ESTADO_ICON[estado];

  return (
    <button type="button" onClick={onToggle} className="flex w-full items-center gap-2.5 bg-bg-app px-4 py-2.5 text-left">
      <Layers size={17} className="shrink-0 text-text-tertiary" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-text-primary">{grupo.codigo}</span>
        <span className="block truncate text-[11px] text-text-tertiary">{grupo.nome}</span>
      </span>
      <span className="shrink-0 text-[11px] font-medium text-text-tertiary">
        {grupo.itens.length} {grupo.itens.length === 1 ? 'carga' : 'cargas'}
      </span>
      <EstadoIcon size={14} className={`shrink-0 ${ESTADO_CLASS[estado]}`} aria-label={ESTADO_LABEL[estado]} />
      <span className={`${LARGURA_VALOR} shrink-0 text-right text-[13px] font-semibold tabular-nums text-text-primary`}>{formatMoeda(totalValor)}</span>
      <ChevronDown size={16} className={`shrink-0 text-text-tertiary transition-transform ${expandido ? 'rotate-180' : ''}`} />
    </button>
  );
}

export function CargasPage(): React.JSX.Element {
  const { abrir } = useNovaCargaOverlay();
  const { fila, removerItem, reenviarItem } = useFilaOffline();
  const { filtro, contentores, cargas, loading, recarregar } = useCargasToolbar();
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const seedFeita = useRef(false);

  const linhas = useMemo<LinhaCarga[]>(() => {
    const daFila: LinhaCarga[] = fila.map((f) => ({
      id: f.id,
      codigo: '',
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
      codigo: '',
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
  }, [cargas, fila]);

  const porEstado = filtro === 'todas' ? linhas : linhas.filter((l) => l.estado === filtro);
  const filtradas = porEstado;

  // Agrupado por Contentor (não por contacto) — cada contentor com
  // cargas ganha uma cor própria e estável, funciona como uma "pasta"
  // colapsável. Contentores sem cargas simplesmente não aparecem.
  const grupos = useMemo<GrupoContentor[]>(() => {
    const mapa = new Map<string, GrupoContentor>();
    for (const l of filtradas) {
      const contentorId = l.prefill.contentorId;
      const contentor = contentores.find((c) => c.id === contentorId);
      const grupo = mapa.get(contentorId) ?? {
        contentorId,
        codigo: contentor?.codigo ?? '—',
        nome: contentor?.nome ?? 'Contentor',
        itens: [],
      };
      grupo.itens.push(l);
      mapa.set(contentorId, grupo);
    }
    return [...mapa.values()].sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [filtradas, contentores]);

  // Por omissão, só os contentores com algo por resolver começam
  // expandidos — os já sincronizados ficam recolhidos para poupar espaço.
  // Só corre uma vez, depois disso a escolha é sempre do utilizador.
  useEffect(() => {
    if (seedFeita.current || loading || grupos.length === 0) return;
    seedFeita.current = true;
    setExpandidos(new Set(grupos.filter((g) => precisaAtencao(g.itens)).map((g) => g.contentorId)));
  }, [grupos, loading]);

  const todosExpandidos = grupos.length > 0 && grupos.every((g) => expandidos.has(g.contentorId));

  function alternarTodos(): void {
    setExpandidos(todosExpandidos ? new Set() : new Set(grupos.map((g) => g.contentorId)));
  }

  function alternarGrupo(contentorId: string): void {
    setExpandidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(contentorId)) novo.delete(contentorId);
      else novo.add(contentorId);
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
        { label: 'Enviar', icon: Send, onClick: () => l.filaId && void reenviarItem(l.filaId) },
        { label: 'Editar', icon: Pencil, onClick: () => void handleEditar(l) },
        { label: 'Eliminar', icon: Trash2, destrutiva: true, onClick: () => l.filaId && void removerItem(l.filaId) },
      ];
    }
    if (l.estado === 'rejeitada' || l.estado === 'pendente') {
      return [{ label: 'Editar', icon: Pencil, onClick: () => void handleEditar(l) }];
    }
    return [];
  }

  return (
    <PullToRefresh onRefresh={recarregar} className="h-full">
      <div className="flex flex-col gap-3 py-4">
        {loading ? (
          <p className="px-4 text-[14px] text-text-tertiary">A carregar...</p>
        ) : grupos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Package size={28} className="text-text-tertiary" />
            <p className="text-[14px] text-text-tertiary">Nenhuma carga aqui.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-end px-4">
              <button
                type="button"
                onClick={alternarTodos}
                title={todosExpandidos ? 'Colapsar todos' : 'Expandir todos'}
                className="flex items-center gap-1 rounded-control px-2 py-1 text-[11px] font-medium text-text-tertiary active:bg-bg-app"
              >
                {todosExpandidos ? <FoldVertical size={13} /> : <UnfoldVertical size={13} />}
                {todosExpandidos ? 'Colapsar todos' : 'Expandir todos'}
              </button>
            </div>
            <CargaListHeader />
            <div className="flex flex-col overflow-hidden border-t border-border">
              {grupos.map((grupo) => {
                const expandido = expandidos.has(grupo.contentorId);
                return (
                  <div key={grupo.contentorId} className="flex flex-col border-b border-border">
                    <GrupoContentorHeader grupo={grupo} expandido={expandido} onToggle={() => alternarGrupo(grupo.contentorId)} />
                    {expandido
                      ? grupo.itens.map((l, i) => <CargaListRow key={l.id} linha={{ ...l, codigo: `#${i + 1}` }} acoes={acoesPara(l)} />)
                      : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
