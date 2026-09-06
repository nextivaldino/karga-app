import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  CaretDown,
  Check,
  ListPlus,
  CheckCircle,
  Stack,
} from '@phosphor-icons/react';
import { NovoContentorModal } from '@/modules/contentores/NovoContentorModal';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAvatarPorUsuario } from '@/hooks/useAvatarPorUsuario';
import { useNavigation } from '@/hooks/useNavigation';
import { useSincronizacaoRapida } from './useSincronizacaoRapida';
import { useTheme } from '@/hooks/useTheme';
import { usePreferenciasUI } from '@/hooks/usePreferenciasUI';
import {
  SYNC_GREEN as GREEN,
  SYNC_ATIVO as ATIVO,
  // notificação — âmbar
  SYNC_NOTIF_HEADER_BG,
  SYNC_NOTIF_BASE_BG,
  SYNC_NOTIF_BORDER,
  SYNC_NOTIF_DIVIDER,
  SYNC_NOTIF_INK,
  SYNC_NOTIF_INK_SOFT,
  SYNC_NOTIF_INVERT_BG,
  // seletor sem notificação — neutro adaptável
  SYNC_SEL_HEADER_LIGHT,
  SYNC_SEL_HEADER_DARK,
  SYNC_SEL_BASE_LIGHT,
  SYNC_SEL_BASE_DARK,
  SYNC_SEL_BORDER_LIGHT,
  SYNC_SEL_BORDER_DARK,
  SYNC_SEL_DIVIDER_LIGHT,
  SYNC_SEL_DIVIDER_DARK,
  SYNC_SEL_INK_LIGHT,
  SYNC_SEL_INK_DARK,
  SYNC_SEL_INK_SOFT_LIGHT,
  SYNC_SEL_INK_SOFT_DARK,
  SYNC_SEL_INVERT_LIGHT,
  SYNC_SEL_INVERT_DARK,
} from '@/modules/sync/syncVisual';
import type { Contentor } from '@/types';


interface SincronizacaoCargaCardProps {
  contentoresAbertos: Contentor[];
  selectedContentorId: string | null;
  onImported?: () => void;
  // Muda o contentor "ativo" da página (mesma função que o
  // ContainerPickerButton usa) — só é preciso quando não há nada por
  // sincronizar, já que aí o pill deixa de ter uma ação de sync para
  // oferecer e passa a servir de seletor de contentor.
  onSelectContentor?: (id: string) => void;
  // Versão maior — usada só na página Sync dedicada, onde este é o
  // protagonista da barra em vez de dividir espaço com o resto das
  // ferramentas (Home/Cargas/Contentores continuam com o tamanho normal).
  grande?: boolean;
}

interface TamanhosCard {
  minFechado: number;
  minAberto: number;
  headerPad: string;
  pillH: string;
  avatarPrincipal: number;
  avatarLista: number;
  fonteNome: string;
  fonteInfo: string;
  btnH: string;
  btnPad: string;
  btnFonte: string;
}

const TAMANHO_COMPACTO: TamanhosCard = {
  minFechado: 310,
  minAberto: 350,
  headerPad: 'p-1.5',
  pillH: 'h-8',
  avatarPrincipal: 22,
  avatarLista: 24,
  fonteNome: 'text-[13px]',
  fonteInfo: 'text-[12px]',
  btnH: 'h-8',
  btnPad: 'px-4',
  btnFonte: 'text-[12px]',
};

const TAMANHO_GRANDE: TamanhosCard = {
  minFechado: 380,
  minAberto: 460,
  // Padding mínimo — a pílula fechada deve ficar com a MESMA altura do
  // botão "Sincronizar" (h-10) lá dentro, não h-10 + folga extra à volta.
  headerPad: 'p-1',
  pillH: 'h-10',
  avatarPrincipal: 28,
  avatarLista: 30,
  fonteNome: 'text-[15px]',
  fonteInfo: 'text-[13px]',
  btnH: 'h-10',
  btnPad: 'px-6',
  btnFonte: 'text-[13px]',
};

const AVATAR_CORES = ['#ef4444', '#38bdf8', '#a78bfa', '#fb923c', '#34d399', '#f472b6', '#818cf8', '#4ade80'];

function formatValorResumido(valor: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor);
}

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

function AvatarFallback({ nome, size = 20, ringColor }: { nome: string; size?: number; ringColor: string }): React.JSX.Element {
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

export function SincronizacaoCargaCard({
  contentoresAbertos,
  selectedContentorId,
  onImported,
  onSelectContentor,
  grande = false,
}: SincronizacaoCargaCardProps): React.JSX.Element | null {
  const t = grande ? TAMANHO_GRANDE : TAMANHO_COMPACTO;
  const { navigate } = useNavigation();
  const avatarPorUsuario = useAvatarPorUsuario();
  const {
    total,
    semConflito,
    comConflito,
    utilizadores,
    count,
    importacao,
    contentoresDisponiveis,
    selecionado,
    handleSincronizarEm,
  } = useSincronizacaoRapida(contentoresAbertos, selectedContentorId, onImported);
  const [open, setOpen] = useState(false);
  const [mostrarOutros, setMostrarOutros] = useState(false);
  const [novoContentorOpen, setNovoContentorOpen] = useState(false);
  const [tremendo, setTremendo] = useState(false);
  const { theme } = useTheme();
  const { badgePulse, notifSound } = usePreferenciasUI();
  const prevCountRef = useRef<number>(count);
  const ref = useRef<HTMLDivElement>(null);
  const [sincronizando, setSincronizando] = useState<string | null>(null);
  const [activeUserIndex, setActiveUserIndex] = useState(0);

  // ── Paleta dinâmica ──────────────────────────────────────────────────────
  // • total > 0  → âmbar (notificação) — destaca em claro e escuro
  // • total === 0 → cinza neutro (seletor) — discreto e adaptado ao tema
  const hasNotif = total > 0;
  const isDark = theme === 'dark';
  const palHdr     = hasNotif ? SYNC_NOTIF_HEADER_BG  : (isDark ? SYNC_SEL_HEADER_DARK  : SYNC_SEL_HEADER_LIGHT);
  const palBase    = hasNotif ? SYNC_NOTIF_BASE_BG    : (isDark ? SYNC_SEL_BASE_DARK    : SYNC_SEL_BASE_LIGHT);
  const palBorder  = hasNotif ? SYNC_NOTIF_BORDER     : (isDark ? SYNC_SEL_BORDER_DARK  : SYNC_SEL_BORDER_LIGHT);
  const palDivider = hasNotif ? SYNC_NOTIF_DIVIDER    : (isDark ? SYNC_SEL_DIVIDER_DARK : SYNC_SEL_DIVIDER_LIGHT);
  const palInk     = hasNotif ? SYNC_NOTIF_INK        : (isDark ? SYNC_SEL_INK_DARK     : SYNC_SEL_INK_LIGHT);
  const palInkSoft = hasNotif ? SYNC_NOTIF_INK_SOFT   : (isDark ? SYNC_SEL_INK_SOFT_DARK: SYNC_SEL_INK_SOFT_LIGHT);
  const palInvert  = hasNotif ? SYNC_NOTIF_INVERT_BG  : (isDark ? SYNC_SEL_INVERT_DARK  : SYNC_SEL_INVERT_LIGHT);
  // ────────────────────────────────────────────────────────────────────────


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

  useEffect(() => {
    if (total === 0 || open || importacao) return;
    const interval = setInterval(() => {
      setTremendo(true);
      setTimeout(() => setTremendo(false), 400);
    }, 12_000);
    return () => clearInterval(interval);
  }, [total, open, importacao]);

  // Rotates through users every 3 seconds if there's more than one
  useEffect(() => {
    if (utilizadores.length <= 1) return;
    const interval = setInterval(() => {
      setActiveUserIndex((curr) => (curr + 1) % utilizadores.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [utilizadores.length]);

  // ── Som de notificação ───────────────────────────────────────────────────
  // Dispara um "ding" suave quando chegam novas cargas (count aumenta).
  // Só reproduz se a preferência notifSound estiver activa.
  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = count;
    if (!notifSound || count <= prev || prev === 0) return; // ignora arranque inicial
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880; // Lá5 — tom cristalino
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.20);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.20);
      // Fechar contexto após o som terminar — evita memory leak
      osc.onended = () => void ctx.close();
    } catch {
      // AudioContext não disponível (ex: headless) — ignorar silenciosamente
    }
  }, [count, notifSound]);
  // ────────────────────────────────────────────────────────────────────────

  async function handleSincronizarEmFechando(contentor: Contentor): Promise<void> {
    setOpen(false);
    setMostrarOutros(false);
    await handleSincronizarEm(contentor);
  }

  async function sincronizarLote(userId: string | null): Promise<void> {
    if (!selecionado) return;
    const itens = userId == null ? undefined : semConflito.filter((r) => (r.pendente.inseridoPorUserId || r.pendente.inseridoPorNome) === userId);
    setSincronizando(userId ?? 'todos');
    await handleSincronizarEm(selecionado, itens);
    setSincronizando(null);
  }

  if (importacao) {
    return (
      <div className="relative z-40 w-auto min-w-[310px] max-w-[400px] rounded-full" style={{ border: `1px solid ${palBorder}` }}>
        <div className="flex items-center justify-between gap-3 overflow-hidden rounded-full px-4 py-2.5" style={{ backgroundColor: palHdr }}>
          <span className="truncate text-left text-[13px] font-semibold tracking-wide" style={{ color: palInk }}>
            A carregar para {importacao.contentorLabel}...
          </span>
          <ArrowsClockwise size={16} weight="bold" className="shrink-0 animate-spin" style={{ color: GREEN }} />
        </div>
      </div>
    );
  }


  if (total === 0) {
    const selecionadoAtual = contentoresAbertos.find((c) => c.id === selectedContentorId) ?? null;
    if (!selecionadoAtual) return null;
    return (
      <div ref={ref} className="relative z-40 flex flex-col items-center justify-center">
        <div
          className={`transition-all duration-300 ${open ? 'rounded-2xl' : 'rounded-full'}`}
          style={{ border: `1px solid ${palBorder}`, minWidth: open ? t.minAberto : t.minFechado }}
        >
          <div
            className={`flex flex-col overflow-hidden transition-all duration-300 ${open ? 'rounded-2xl' : 'rounded-full'}`}
            style={{ backgroundColor: open ? palInvert : palHdr }}
          >
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              disabled={contentoresAbertos.length === 0}
              className={`flex w-full items-center gap-1.5 ${t.headerPad} text-left transition-colors hover:bg-black/5 disabled:cursor-default disabled:hover:bg-transparent`}
              style={{ backgroundColor: palHdr }}
            >
              <div className={`flex ${t.pillH} flex-1 items-center gap-2 rounded-full pl-2 pr-1`}>
                <span
                  className="flex shrink-0 items-center justify-center rounded-full text-white shadow-sm"
                  style={{ backgroundColor: ATIVO, width: t.avatarPrincipal, height: t.avatarPrincipal }}
                >
                  <CheckCircle size={grande ? 16 : 14} weight="bold" />
                </span>
                <span className={`truncate ${t.fonteNome} font-semibold tracking-wide`} style={{ color: palInk }}>
                  {selecionadoAtual.nome}
                </span>
                <span
                  className="relative ml-1 flex shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{ backgroundColor: `${ATIVO}26`, color: ATIVO }}
                >
                  Ativo
                  <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: ATIVO }} />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ATIVO }} />
                  </span>
                </span>
              </div>
              <div className={`flex shrink-0 items-center pr-2 pl-2 ${t.fonteInfo} font-medium`} style={{ color: palInkSoft }}>
                {selecionadoAtual.totalCargas} {selecionadoAtual.totalCargas === 1 ? 'carga' : 'cargas'}
                <span className="mx-2 opacity-40">•</span>
                {formatValorResumido(selecionadoAtual.valorTotal)}
              </div>
              {contentoresAbertos.length > 0 ? (
                <CaretDown
                  size={14}
                  className={`mr-1 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                  style={{ color: palInkSoft }}
                />
              ) : null}
            </button>

            <div
              className="grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <div style={{ borderTop: `1px solid ${palDivider}` }}>
                  <div className="px-4 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: palInkSoft }}>
                    Escolher contentor
                  </div>
                  <div className="max-h-[220px] overflow-y-auto pb-1.5">
                    {contentoresAbertos.map((c) => {
                      const isSelected = c.id === selectedContentorId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onSelectContentor?.(c.id);
                            setOpen(false);
                          }}
                          className="flex w-full items-center gap-2 truncate px-4 py-2.5 text-left text-[13px] font-medium transition-colors hover:bg-black/5"
                          style={{ color: isSelected ? ATIVO : palInk }}
                        >
                          <Stack
                            size={16}
                            weight={isSelected ? 'fill' : 'duotone'}
                            className="shrink-0"
                            style={{ color: isSelected ? ATIVO : palInkSoft }}
                          />
                          <span className="min-w-0 flex-1 truncate">{c.codigo} — {c.nome}</span>
                          {isSelected ? <Check size={14} weight="bold" style={{ color: ATIVO }} /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  const activeUser = utilizadores[activeUserIndex];

  return (
    <div ref={ref} className="relative z-40 flex flex-col items-center justify-center">
      <div
        className={`flex flex-col overflow-hidden transition-all duration-300 ease-out ${tremendo ? 'animate-karga-tremor' : ''} ${open ? 'rounded-2xl' : 'rounded-full'}`}
        style={{ backgroundColor: open ? palInvert : palBase, border: `1px solid ${palBorder}`, minWidth: open ? t.minAberto : t.minFechado }}
      >
        <div className={`flex items-center gap-2 ${t.headerPad}`} style={{ backgroundColor: palHdr }}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`flex ${t.pillH} flex-1 items-center gap-2.5 rounded-full pl-2 pr-3 transition-all hover:bg-black/10 active:scale-[0.98]`}
          >
            {/* Badge de contagem — anel pulse lento (3 s) quando badgePulse activo */}
            <span className="relative flex shrink-0 items-center justify-center" style={{ height: t.avatarPrincipal, minWidth: t.avatarPrincipal + 2 }}>
              {badgePulse ? (
                <span
                  className="absolute inset-0 rounded-full animate-ping opacity-50"
                  style={{ backgroundColor: GREEN, animationDuration: '3s' }}
                />
              ) : null}
              <span
                className="relative flex h-full min-w-full items-center justify-center rounded-full px-1 text-[12px] font-bold text-white"
                style={{ backgroundColor: GREEN }}
              >
                {count}
              </span>
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {activeUser ? (
                <>
                  <span className="shrink-0 flex items-center justify-center">
                    {avatarPorUsuario.get(activeUser.userId) ? (
                      <span className="inline-flex shrink-0 rounded-full" style={{ boxShadow: `0 0 0 2px ${palHdr}` }}>
                        <UserAvatar avatar={avatarPorUsuario.get(activeUser.userId)!} size={t.avatarPrincipal} />
                      </span>
                    ) : (
                      <AvatarFallback nome={activeUser.nome} size={t.avatarPrincipal} ringColor={palHdr} />
                    )}
                  </span>
                  <span key={activeUser.nome} className={`truncate ${t.fonteNome} font-semibold tracking-wide animate-in fade-in slide-in-from-bottom-1 duration-300`} style={{ color: palInk }}>
                    {activeUser.nome} {utilizadores.length > 1 ? <span className="font-normal opacity-60">+{utilizadores.length - 1}</span> : null}
                  </span>
                </>
              ) : null}
            </span>
          </button>

          {semConflito.length > 0 ? (
            <button
              type="button"
              disabled={!selecionado || sincronizando != null}
              title={selecionado ? `Sincronizar em ${selecionado.nome}` : 'Escolha um contentor primeiro'}
              onClick={() => void sincronizarLote(null)}
              className={`flex ${t.btnH} shrink-0 items-center justify-center gap-1.5 rounded-full ${t.btnPad} ${t.btnFonte} font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.96] disabled:opacity-50 disabled:active:scale-100`}
              style={{ backgroundColor: GREEN }}
            >
              {sincronizando === 'todos' ? <ArrowsClockwise size={15} className="animate-spin" /> : <ArrowsClockwise size={15} weight="bold" />}
              Sincronizar
            </button>
          ) : null}

          {comConflito > 0 ? (
            <button
              type="button"
              onClick={irParaRevisao}
              className={`flex ${t.btnH} shrink-0 items-center justify-center gap-1.5 rounded-full ${t.btnPad} ${t.btnFonte} font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.96]`}
              style={{ backgroundColor: '#d97706' }}
            >
              Rever
              <ArrowRight size={13} weight="bold" />
            </button>
          ) : null}
        </div>

        {/* Unified Dropdown Content with Fluid Animation */}
        <div
          className="grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div style={{ borderTop: `1px solid ${palDivider}` }}>
              {utilizadores.length > 0 ? (
                <div className="flex flex-col gap-1.5 p-2" style={{ borderBottom: `1px solid ${palDivider}` }}>
                  {utilizadores.map((u) => {
                    const url = avatarPorUsuario.get(u.userId);
                    return (
                      <div key={u.nome} className="flex items-center justify-between rounded-control px-2.5 py-2 transition-all hover:bg-black/10" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}>
                        <div className="flex items-center gap-2.5">
                          <span className="flex items-center justify-center shrink-0">
                            {url ? (
                              <UserAvatar avatar={url} size={t.avatarLista} />
                            ) : (
                              <AvatarFallback nome={u.nome} size={t.avatarLista} ringColor="transparent" />
                            )}
                          </span>
                          <span className={`${t.fonteNome} font-medium leading-none`} style={{ color: palInk }}>{u.nome}</span>
                          <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white leading-none shadow-sm" style={{ backgroundColor: GREEN }}>
                            {u.count}
                          </span>
                        </div>
                        {selecionado ? (
                          <button
                            type="button"
                            disabled={sincronizando != null}
                            onClick={() => { setOpen(false); void sincronizarLote(u.userId); }}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.92] disabled:opacity-50"
                            style={{ backgroundColor: GREEN }}
                            title="Sincronizar utilizador"
                          >
                            <ArrowsClockwise size={14} weight="bold" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setMostrarOutros((v) => !v)}
                className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[13px] font-medium transition-all hover:bg-black/10"
                style={{ color: palInk }}
              >
                <div className="flex items-center gap-2.5">
                  <Stack size={16} weight="duotone" style={{ color: palInkSoft }} className="transition-colors group-hover:text-amber-300" />
                  Escolher outro contentor
                </div>
                <CaretDown size={14} className={`shrink-0 transition-transform duration-300 ${mostrarOutros ? 'rotate-180 text-amber-300' : ''}`} style={{ color: palInkSoft }} />
              </button>

              {/* Fluid Animation for "Outros Contentores" */}
              <div
                className="grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ gridTemplateRows: mostrarOutros ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <div
                    className="max-h-[180px] overflow-y-auto py-1.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.25)]"
                    style={{ backgroundColor: '#292008', borderTop: `1px solid ${palDivider}`, borderBottom: `1px solid ${palDivider}` }}
                  >
                    {contentoresDisponiveis
                      .filter((c) => c.id !== selectedContentorId)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => void handleSincronizarEmFechando(c)}
                          className="flex w-full items-center gap-2 truncate px-4 py-2.5 text-left text-[13px] font-medium transition-colors hover:bg-[#fbbf24]/10 active:bg-[#fbbf24]/20"
                          style={{ color: '#fcd34d' }}
                        >
                          <Stack size={16} weight="duotone" className="shrink-0 text-[#f59e0b]" />
                          <span className="truncate">{c.codigo} — {c.nome}</span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setMostrarOutros(false);
                  setNovoContentorOpen(true);
                }}
                className="group flex w-full items-center gap-2.5 px-4 py-3 text-left text-[12px] font-semibold transition-all hover:bg-black/10 active:bg-black/15"
                style={{ color: '#4ade80', borderTop: `1px solid ${palDivider}` }}
              >
                <ListPlus size={16} weight="bold" className="text-[#22c55e] transition-transform group-hover:scale-110" />
                Criar contentor-lista
              </button>

              {comConflito > 0 ? (
                <button
                  type="button"
                  onClick={irParaRevisao}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[12px] font-medium transition-all hover:bg-amber-500/10 active:bg-amber-500/20"
                  style={{ color: palInkSoft, borderTop: `1px solid ${palDivider}` }}
                >
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                      <ArrowRight size={12} weight="bold" />
                    </span>
                    +{comConflito} {comConflito === 1 ? 'carga precisa' : 'cargas precisam'} de revisão
                  </span>
                  <ArrowRight size={13} className="text-amber-300" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <NovoContentorModal
        open={novoContentorOpen}
        onClose={() => setNovoContentorOpen(false)}
        listaInicial
        onSaved={(contentor) => void handleSincronizarEmFechando(contentor)}
      />
    </div>
  );
}
