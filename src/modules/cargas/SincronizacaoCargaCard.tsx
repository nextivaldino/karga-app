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
import {
  SYNC_BASE_BG as BASE_BG,
  SYNC_DIVIDER as DIVIDER,
  SYNC_HEADER_BG as HEADER_BG,
  SYNC_INK as INK,
  SYNC_INK_SOFT as INK_SOFT,
  SYNC_GREEN as GREEN,
  SYNC_INVERT_BG as INVERT_BG,
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
}

const AVATAR_CORES = ['#ef4444', '#38bdf8', '#a78bfa', '#fb923c', '#34d399', '#f472b6', '#818cf8', '#4ade80'];
const WARNING_BG = '#d97706'; // amber-600 — deep amber, high contrast on dark

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
}: SincronizacaoCargaCardProps): React.JSX.Element | null {
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
  const ref = useRef<HTMLDivElement>(null);
  const [sincronizando, setSincronizando] = useState<string | null>(null);
  const [activeUserIndex, setActiveUserIndex] = useState(0);

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
      <div className="relative z-40 w-auto min-w-[310px] max-w-[400px] overflow-hidden rounded-full shadow-lg shadow-black/20" style={{ backgroundColor: HEADER_BG, border: `1px solid ${DIVIDER}` }}>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5" style={{ backgroundColor: HEADER_BG }}>
          <span className="truncate text-left text-[13px] font-semibold tracking-wide" style={{ color: INK }}>
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
          className={`flex flex-col overflow-hidden shadow-lg shadow-black/20 transition-all duration-300 ${open ? 'rounded-2xl' : 'rounded-full'}`}
          style={{ backgroundColor: open && theme === 'dark' ? INVERT_BG : BASE_BG, border: `1px solid ${DIVIDER}`, minWidth: open ? 350 : 310 }}
        >
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            disabled={contentoresAbertos.length === 0}
            className="flex w-full items-center gap-1.5 p-1.5 text-left transition-colors hover:bg-white/5 disabled:cursor-default disabled:hover:bg-transparent"
            style={{ backgroundColor: HEADER_BG }}
          >
            <div className="flex h-8 flex-1 items-center gap-2 rounded-full pl-2 pr-1">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#38bdf8] text-white shadow-sm">
                <CheckCircle size={14} weight="bold" />
              </span>
              <span className="truncate text-[13px] font-semibold tracking-wide text-slate-100">
                {selecionadoAtual.nome}
              </span>
              <span className="relative ml-1 flex shrink-0 items-center justify-center rounded-full bg-[#38bdf8]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#38bdf8]">
                Ativo
                <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#38bdf8] opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#38bdf8]" />
                </span>
              </span>
            </div>
            <div className="flex shrink-0 items-center pr-2 pl-2 text-[12px] font-medium text-slate-400">
              {selecionadoAtual.totalCargas} {selecionadoAtual.totalCargas === 1 ? 'carga' : 'cargas'}
              <span className="mx-2 opacity-40">•</span>
              {formatValorResumido(selecionadoAtual.valorTotal)}
            </div>
            {contentoresAbertos.length > 0 ? (
              <CaretDown
                size={14}
                className={`mr-1 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                style={{ color: INK_SOFT }}
              />
            ) : null}
          </button>

          <div
            className="grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
          >
            <div className="overflow-hidden">
              <div style={{ borderTop: `1px solid ${DIVIDER}` }}>
                <div className="px-4 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: INK_SOFT }}>
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
                        className="flex w-full items-center gap-2 truncate px-4 py-2.5 text-left text-[13px] font-medium transition-colors hover:bg-white/5"
                        style={{ color: isSelected ? '#38bdf8' : INK }}
                      >
                        <Stack
                          size={16}
                          weight={isSelected ? 'fill' : 'duotone'}
                          className="shrink-0"
                          style={{ color: isSelected ? '#38bdf8' : INK_SOFT }}
                        />
                        <span className="min-w-0 flex-1 truncate">{c.codigo} — {c.nome}</span>
                        {isSelected ? <Check size={14} weight="bold" style={{ color: '#38bdf8' }} /> : null}
                      </button>
                    );
                  })}
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
        className={`flex flex-col overflow-hidden shadow-lg shadow-black/25 transition-all duration-300 ease-out ${tremendo ? 'animate-karga-tremor' : ''} ${open ? 'rounded-2xl' : 'rounded-full'}`}
        style={{ backgroundColor: open && theme === 'dark' ? INVERT_BG : BASE_BG, border: `1px solid ${DIVIDER}`, minWidth: open ? 350 : 310 }}
      >
        <div className="flex items-center gap-2 p-1.5" style={{ backgroundColor: HEADER_BG }}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-8 flex-1 items-center gap-2.5 rounded-full pl-2 pr-3 transition-all hover:bg-white/5 active:scale-[0.98]"
          >
            <span className="flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full px-1 text-[12px] font-bold text-white shadow-sm" style={{ backgroundColor: GREEN }}>
              {count}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {activeUser ? (
                <>
                  <span className="shrink-0 flex items-center justify-center">
                    {avatarPorUsuario.get(activeUser.userId) ? (
                      <span className="inline-flex shrink-0 rounded-full" style={{ boxShadow: `0 0 0 2px ${HEADER_BG}` }}>
                        <UserAvatar avatar={avatarPorUsuario.get(activeUser.userId)!} size={22} />
                      </span>
                    ) : (
                      <AvatarFallback nome={activeUser.nome} size={22} ringColor={HEADER_BG} />
                    )}
                  </span>
                  <span key={activeUser.nome} className="truncate text-[13px] font-semibold tracking-wide animate-in fade-in slide-in-from-bottom-1 duration-300" style={{ color: INK }}>
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
              className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[12px] font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.96] disabled:opacity-50 disabled:active:scale-100"
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
              className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[12px] font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.96]"
              style={{ backgroundColor: WARNING_BG }}
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
            <div style={{ borderTop: `1px solid ${DIVIDER}` }}>
              {utilizadores.length > 0 ? (
                <div className="flex flex-col gap-1.5 p-2" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
                  {utilizadores.map((u) => {
                    const url = avatarPorUsuario.get(u.userId);
                    return (
                      <div key={u.nome} className="flex items-center justify-between rounded-control px-2.5 py-2 transition-all hover:bg-white/5" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <div className="flex items-center gap-2.5">
                          <span className="flex items-center justify-center shrink-0">
                            {url ? (
                              <UserAvatar avatar={url} size={24} />
                            ) : (
                              <AvatarFallback nome={u.nome} size={24} ringColor="transparent" />
                            )}
                          </span>
                          <span className="text-[13px] font-medium leading-none" style={{ color: INK }}>{u.nome}</span>
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
                className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[13px] font-medium transition-all hover:bg-white/5"
                style={{ color: INK }}
              >
                <div className="flex items-center gap-2.5">
                  <Stack size={16} weight="duotone" style={{ color: INK_SOFT }} className="transition-colors group-hover:text-amber-400" />
                  Escolher outro contentor
                </div>
                <CaretDown size={14} className={`shrink-0 transition-transform duration-300 ${mostrarOutros ? 'rotate-180 text-amber-400' : ''}`} style={{ color: INK_SOFT }} />
              </button>
              
              {/* Fluid Animation for "Outros Contentores" */}
              <div 
                className="grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ gridTemplateRows: mostrarOutros ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <div 
                    className="max-h-[180px] overflow-y-auto py-1.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.25)]" 
                    style={{ backgroundColor: '#292008', borderTop: `1px solid ${DIVIDER}`, borderBottom: `1px solid ${DIVIDER}` }}
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
                className="group flex w-full items-center gap-2.5 px-4 py-3 text-left text-[12px] font-semibold transition-all hover:bg-white/5 active:bg-white/10"
                style={{ color: '#4ade80', borderTop: `1px solid ${DIVIDER}` }}
              >
                <ListPlus size={16} weight="bold" className="text-[#22c55e] transition-transform group-hover:scale-110" /> 
                Criar contentor-lista
              </button>

              {comConflito > 0 ? (
                <button
                  type="button"
                  onClick={irParaRevisao}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[12px] font-medium transition-all hover:bg-amber-500/10 active:bg-amber-500/20"
                  style={{ color: INK_SOFT, borderTop: `1px solid ${DIVIDER}` }}
                >
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                      <ArrowRight size={12} weight="bold" />
                    </span>
                    +{comConflito} {comConflito === 1 ? 'carga precisa' : 'cargas precisam'} de revisão
                  </span>
                  <ArrowRight size={13} className="text-amber-400" />
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
