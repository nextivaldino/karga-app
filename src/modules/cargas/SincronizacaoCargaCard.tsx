import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  CaretDown,
  CheckCircle,
  CircleDashed,
  ListPlus,
  XCircle,
} from '@phosphor-icons/react';
import { NovoContentorModal } from '@/modules/contentores/NovoContentorModal';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAvatarPorUsuario } from '@/hooks/useAvatarPorUsuario';
import { useNavigation } from '@/hooks/useNavigation';
import { useSincronizacaoRapida } from './useSincronizacaoRapida';
import {
  SYNC_BASE_BG as BASE_BG,
  SYNC_CRIAR_BG as CRIAR_BG,
  SYNC_DIVIDER as DIVIDER,
  SYNC_HEADER_BG as HEADER_BG,
  SYNC_HOVER as HOVER,
  SYNC_INK as INK,
  SYNC_INK_SOFT as INK_SOFT,
} from '@/modules/sync/syncVisual';
import type { Contentor } from '@/types';

interface SincronizacaoCargaCardProps {
  contentoresAbertos: Contentor[];
  selectedContentorId: string | null;
  // Chamado depois de a importação terminar, para a página de Cargas
  // atualizar a lista visível — este card é só um atalho para o MESMO
  // sistema de sincronização da Home/Configurações, não uma cópia dele.
  onImported?: () => void;
}

function formatValorResumido(valor: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor);
}

// Iniciais + cor determinística por nome — os utilizadores da PWA não têm
// foto de perfil, mas o card tem sempre de estar pronto para vários ao
// mesmo tempo e deixar claro quem é quem, mesmo sem upload de imagem.
const AVATAR_CORES = ['#dc2626', '#0891b2', '#7c3aed', '#c2410c', '#0d9488', '#be185d', '#4338ca', '#15803d'];

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeiras = partes.length > 1 ? [partes[0]!, partes[partes.length - 1]!] : [partes[0] ?? '?'];
  return primeiras.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function corAvatar(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) >>> 0;
  return AVATAR_CORES[hash % AVATAR_CORES.length]!;
}

function Avatar({
  nome,
  size = 20,
  ringColor,
  avatarUrl,
}: {
  nome: string;
  size?: number;
  ringColor: string;
  avatarUrl?: string | null;
}): React.JSX.Element {
  if (avatarUrl) {
    return (
      <span title={nome} className="inline-flex shrink-0 rounded-full" style={{ boxShadow: `0 0 0 2px ${ringColor}` }}>
        <UserAvatar avatar={avatarUrl} size={size} />
      </span>
    );
  }
  return (
    <span
      title={nome}
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        backgroundColor: corAvatar(nome),
        boxShadow: `0 0 0 2px ${ringColor}`,
      }}
    >
      {iniciais(nome)}
    </span>
  );
}

// Aviso de cargas novas da PWA — bloco único e plano em amarelo (mesma
// cor em todos os estados: trigger, dropdown e progresso), para ler como
// UMA peça conectada em vez de um botão + popover flutuante à parte.
// Ao escolher um alvo, o bloco expande para baixo e mostra a lista das
// cargas a carregar, uma a uma. Só trata das cargas sem conflito de
// contacto (`semConflito`) — as que precisam de decisão humana continuam
// a viver em "Rever tudo" (SincronizacaoView). A lógica de dados é
// partilhada com a barra "pro" da página Sync via `useSincronizacaoRapida`
// — este componente só trata da sua própria apresentação compacta.
export function SincronizacaoCargaCard({
  contentoresAbertos,
  selectedContentorId,
  onImported,
}: SincronizacaoCargaCardProps): React.JSX.Element | null {
  const { navigate } = useNavigation();
  const avatarPorUsuario = useAvatarPorUsuario();
  const {
    total,
    semConflito,
    comConflito,
    utilizadores,
    count,
    mensagemAtual,
    msgIndex,
    importacao,
    contentoresDisponiveis,
    selecionado,
    handleSincronizarEm,
  } = useSincronizacaoRapida(contentoresAbertos, selectedContentorId, onImported);
  const [open, setOpen] = useState(false);
  const [mostrarOutros, setMostrarOutros] = useState(false);
  const [novoContentorOpen, setNovoContentorOpen] = useState(false);
  const [tremendo, setTremendo] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function irParaRevisao(): void {
    navigate('sync');
  }

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setMostrarOutros(false);
      }
    }
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        setOpen(false);
        setMostrarOutros(false);
      }
    }
    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Tremor curto e periódico (não contínuo) para chamar a atenção sem
  // ser irritante — só enquanto houver mesmo algo por sincronizar/rever
  // e o cartão estiver na sua forma "de repouso" (fechado, sem
  // importação em curso).
  useEffect(() => {
    if (total === 0 || open || importacao) return;
    const interval = setInterval(() => {
      setTremendo(true);
      setTimeout(() => setTremendo(false), 400);
    }, 12_000);
    return () => clearInterval(interval);
  }, [total, open, importacao]);

  async function handleSincronizarEmFechando(contentor: Contentor): Promise<void> {
    setOpen(false);
    setMostrarOutros(false);
    await handleSincronizarEm(contentor);
  }

  if (importacao) {
    return (
      <div className="relative z-40 w-[340px] overflow-hidden rounded-control" style={{ backgroundColor: BASE_BG }}>
        <div className="flex items-center gap-3 px-4 py-2.5" style={{ backgroundColor: HEADER_BG }}>
          <span className="min-w-0 flex-1 truncate text-left text-[12px] font-semibold tracking-wide" style={{ color: INK }}>
            A carregar para {importacao.contentorLabel}...
          </span>
          <ArrowsClockwise size={16} weight="bold" className="shrink-0 animate-spin text-[#16a34a]" />
        </div>
        <div className="max-h-[200px] overflow-y-auto px-4 py-1.5" style={{ borderTop: `1px solid ${DIVIDER}` }}>
          {importacao.itens.map((it) => (
            <div key={it.id} className="flex items-center gap-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: INK_SOFT }}>
                {it.nome}
              </span>
              {it.status === 'pendente' ? <CircleDashed size={14} className="shrink-0" style={{ color: INK_SOFT }} /> : null}
              {it.status === 'ok' ? <CheckCircle size={14} weight="fill" className="shrink-0 text-[#16a34a]" /> : null}
              {it.status === 'erro' ? (
                <span title={it.erro} className="shrink-0 text-[#dc2626]">
                  <XCircle size={14} weight="fill" />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Nada mesmo pendente — mostra o contentor ativo em repouso, mas
  // deixa claro que é mesmo ESSE o selecionado (não só o nome solto):
  // ponto verde + "Ativo", igual à linguagem já usada no resto da app
  // para "isto está escolhido".
  if (total === 0) {
    const selecionadoAtual = contentoresAbertos.find((c) => c.id === selectedContentorId) ?? null;
    if (!selecionadoAtual) return null;
    return (
      <div className="flex h-9 w-[340px] items-center gap-2 rounded-control border border-success/30 bg-success/[0.06] px-4">
        <CheckCircle size={15} weight="fill" className="shrink-0 text-success" />
        <span className="truncate text-[12px] font-medium text-text-primary">{selecionadoAtual.nome}</span>
        <span className="shrink-0 rounded-pill bg-success/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-success">
          Ativo
        </span>
        <span className="ml-auto shrink-0 text-[11px] text-text-tertiary">
          {selecionadoAtual.totalCargas} carga{selecionadoAtual.totalCargas === 1 ? '' : 's'} ·{' '}
          {formatValorResumido(selecionadoAtual.valorTotal)}
        </span>
      </div>
    );
  }

  // Tudo o que está pendente tem conflito de contacto — o atalho de
  // sincronização direta não se aplica a nenhuma delas, mas isso não
  // pode desaparecer do radar: mostra um aviso próprio a apontar para
  // "Rever tudo" em vez de cair silenciosamente no estado de repouso.
  if (semConflito.length === 0) {
    return (
      <button
        type="button"
        onClick={irParaRevisao}
        className={`flex h-9 w-[340px] items-center gap-2.5 rounded-control px-4 transition-transform hover:scale-[1.01] ${tremendo ? 'animate-karga-tremor' : ''}`}
        style={{ backgroundColor: HEADER_BG }}
      >
        <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-warning px-1 text-[11px] font-bold text-white">
          {comConflito}
        </span>
        <span className="min-w-0 flex-1 truncate text-left text-[12px] font-semibold tracking-wide" style={{ color: INK }}>
          {comConflito === 1 ? 'carga a precisar de revisão' : 'cargas a precisar de revisão'}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium" style={{ color: INK }}>
          Rever tudo <ArrowRight size={12} />
        </span>
      </button>
    );
  }

  const AVATARES_VISIVEIS = 3;

  return (
    <div ref={ref} className="relative z-40 w-[340px] overflow-hidden rounded-control" style={{ backgroundColor: BASE_BG }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 w-full items-center gap-2 px-4 transition-colors ${tremendo ? 'animate-karga-tremor' : ''}`}
        style={{ backgroundColor: HEADER_BG, filter: open ? 'brightness(0.94)' : undefined }}
      >
        <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#16a34a] px-1 text-[11px] font-bold text-white">
          {count}
        </span>
        <span className="flex shrink-0 items-center">
          {utilizadores.slice(0, AVATARES_VISIVEIS).map((u, i) => (
            <span key={u.nome} style={{ marginLeft: i === 0 ? 0 : -6 }}>
              <Avatar nome={u.nome} size={19} ringColor={HEADER_BG} avatarUrl={avatarPorUsuario.get(u.userId)} />
            </span>
          ))}
          {utilizadores.length > AVATARES_VISIVEIS ? (
            <span
              className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ marginLeft: -6, backgroundColor: INK_SOFT, boxShadow: `0 0 0 2px ${HEADER_BG}` }}
            >
              +{utilizadores.length - AVATARES_VISIVEIS}
            </span>
          ) : null}
        </span>
        <span className="min-w-0 flex-1 overflow-hidden text-left text-[12px] font-semibold tracking-wide" style={{ color: INK }}>
          <span key={msgIndex} className="block truncate animate-karga-fade">
            {mensagemAtual}
          </span>
        </span>
        <ArrowsClockwise size={16} weight="bold" className="shrink-0 text-[#16a34a]" />
      </button>

      {open ? (
        <div style={{ borderTop: `1px solid ${DIVIDER}` }}>
          {utilizadores.length > 1 ? (
            <div className="flex flex-wrap gap-1.5 px-4 py-2" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
              {utilizadores.map((u) => (
                <span
                  key={u.nome}
                  className="flex items-center gap-1.5 rounded-pill px-2 py-1 text-[11px] font-medium"
                  style={{ backgroundColor: 'rgba(0,0,0,0.06)', color: INK }}
                >
                  <Avatar nome={u.nome} size={16} ringColor={BASE_BG} avatarUrl={avatarPorUsuario.get(u.userId)} />
                  {u.nome} · {u.count}
                </span>
              ))}
            </div>
          ) : null}
          {selecionado ? (
            <button
              type="button"
              onClick={() => void handleSincronizarEmFechando(selecionado)}
              className="flex w-full flex-col gap-0.5 px-4 py-2 text-left transition-colors"
              style={{ color: INK }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span className="text-[13px] font-medium">Sincronizar em {selecionado.nome}</span>
              <span className="text-[11px]" style={{ color: INK_SOFT }}>
                Contentor selecionado atualmente
              </span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setMostrarOutros((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-[13px] transition-colors"
            style={{ color: INK }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Escolher outro contentor
            <CaretDown size={13} className={`shrink-0 transition-transform ${mostrarOutros ? 'rotate-180' : ''}`} style={{ color: INK_SOFT }} />
          </button>
          {mostrarOutros ? (
            <div className="max-h-[180px] overflow-y-auto py-1" style={{ borderTop: `1px solid ${DIVIDER}`, borderBottom: `1px solid ${DIVIDER}` }}>
              {contentoresDisponiveis
                .filter((c) => c.id !== selectedContentorId)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void handleSincronizarEmFechando(c)}
                    className="block w-full truncate px-4 py-1.5 text-left text-[12px] transition-colors"
                    style={{ color: INK }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {c.codigo} — {c.nome}
                  </button>
                ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setMostrarOutros(false);
              setNovoContentorOpen(true);
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-semibold transition-colors"
            style={{ color: INK, backgroundColor: CRIAR_BG, borderTop: `1px solid ${DIVIDER}` }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(0.94)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
          >
            <ListPlus size={16} /> Criar contentor-lista
          </button>

          {comConflito > 0 ? (
            <button
              type="button"
              onClick={irParaRevisao}
              className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-[12px] transition-colors"
              style={{ color: INK_SOFT, borderTop: `1px solid ${DIVIDER}` }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              +{comConflito} {comConflito === 1 ? 'carga precisa' : 'cargas precisam'} de revisão manual
              <ArrowRight size={12} />
            </button>
          ) : null}
        </div>
      ) : null}

      <NovoContentorModal
        open={novoContentorOpen}
        onClose={() => setNovoContentorOpen(false)}
        listaInicial
        onSaved={(contentor) => void handleSincronizarEmFechando(contentor)}
      />
    </div>
  );
}
