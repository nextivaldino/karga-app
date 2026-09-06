import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCircle, Info, Warning, XCircle } from '@phosphor-icons/react';
import { ipcService } from '@/services/ipcService';
import { useNavigation } from '@/hooks/useNavigation';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import type { MainPage, Notificacao } from '@/types';

const TIPO_VISUAL: Record<Notificacao['tipo'], { Icon: typeof Info; bg: string; fg: string }> = {
  info: { Icon: Info, bg: 'bg-warning/15', fg: 'text-warning' },
  sucesso: { Icon: CheckCircle, bg: 'bg-success/15', fg: 'text-success' },
  aviso: { Icon: Warning, bg: 'bg-warning/15', fg: 'text-warning' },
  erro: { Icon: XCircle, bg: 'bg-error/15', fg: 'text-error' },
};

const PAGINAS_VALIDAS: MainPage[] = ['home', 'cargas', 'contentores', 'configuracoes', 'sync'];

export function NotificacoesBell(): React.JSX.Element | null {
  const { navigate } = useNavigation();
  const [open, setOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  async function carregar(): Promise<void> {
    const dados = await ipcService.notificacoes.list();
    setNotificacoes(dados);
  }

  useEffect(() => {
    void carregar();
    const offAtualizada = window.kraga.on('notificacoes:atualizada', () => void carregar());
    const offNavegar = window.kraga.on('notificacoes:navegar', (...args: unknown[]) => {
      const payload = args[0] as { linkModulo: string | null; linkEntidadeId: string | null };
      if (payload.linkModulo && PAGINAS_VALIDAS.includes(payload.linkModulo as MainPage)) {
        navigate(payload.linkModulo as MainPage, payload.linkEntidadeId ? { entidadeId: payload.linkEntidadeId } : undefined);
      }
      void carregar();
    });
    const interval = setInterval(() => void carregar(), 60_000);
    return () => {
      offAtualizada();
      offNavegar();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const portal = document.getElementById('notificacoes-portal');
        if (portal && portal.contains(e.target as Node)) return;
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    function updatePos(): void {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDropdownPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    updatePos();
    window.addEventListener('resize', updatePos);
    return () => window.removeEventListener('resize', updatePos);
  }, [open]);

  async function handleClickNotificacao(n: Notificacao): Promise<void> {
    if (!n.lida) await ipcService.notificacoes.marcarLida(n.id);
    setOpen(false);
    void carregar();
    if (n.linkModulo && PAGINAS_VALIDAS.includes(n.linkModulo as MainPage)) {
      navigate(n.linkModulo as MainPage, n.linkEntidadeId ? { entidadeId: n.linkEntidadeId } : undefined);
    }
  }

  async function handleLimpar(): Promise<void> {
    await ipcService.notificacoes.marcarTodasLidas();
    void carregar();
  }

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  if (naoLidas === 0) return null;

  return (
    <div ref={containerRef} className="relative z-[90]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`${naoLidas} notificaç${naoLidas === 1 ? 'ão' : 'ões'} por ler`}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className={`flex h-9 items-center gap-1.5 rounded-pill px-2.5 transition-transform hover:scale-105 ${
          open ? 'bg-text-primary/15' : 'bg-text-primary/10'
        }`}
      >
        <Bell size={16} weight="bold" className="text-text-primary" />
        <span className="whitespace-nowrap text-[11px] font-bold text-text-primary">
          {naoLidas > 99 ? '99+' : naoLidas} notificaç{naoLidas === 1 ? 'ão' : 'ões'}
        </span>
      </button>

      {open && dropdownPos ? createPortal(
        <div id="notificacoes-portal" className="fixed z-[100] w-80 overflow-hidden rounded-surface border border-border bg-bg-surface shadow-lg" style={{ top: dropdownPos.top, right: dropdownPos.right }}>
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-[13px] font-semibold text-text-primary">Notificações</span>
            <button
              type="button"
              onClick={() => void handleLimpar()}
              className="text-[12px] font-medium text-warning hover:underline"
            >
              Limpar
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="px-3 py-6 text-center text-[13px] text-text-tertiary">Nenhuma notificação.</p>
            ) : (
              notificacoes.map((n) => {
                const visual = TIPO_VISUAL[n.tipo];
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void handleClickNotificacao(n)}
                    className={`flex w-full items-start gap-2.5 border-b border-border px-3 py-2.5 text-left last:border-b-0 transition-colors hover:bg-bg-app ${
                      n.lida ? 'opacity-60' : ''
                    }`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${visual.bg}`}>
                      <visual.Icon size={15} weight="fill" className={visual.fg} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-text-primary">{n.titulo}</span>
                      {n.mensagem ? <span className="block truncate text-[11px] text-text-tertiary">{n.mensagem}</span> : null}
                      <span className="block text-[10px] text-text-tertiary">{formatRelativeTime(n.createdAt)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
