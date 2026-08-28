import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { ipcService } from '@/services/ipcService';
import { useNavigation } from '@/hooks/useNavigation';
import { formatRelativo } from '@/lib/formatRelativo';
import type { MainPage, Notificacao } from '@/types';

const TIPO_COR: Record<Notificacao['tipo'], string> = {
  info: 'bg-primary',
  sucesso: 'bg-success',
  aviso: 'bg-warning',
  erro: 'bg-error',
};

const PAGINAS_VALIDAS: MainPage[] = ['home', 'cargas', 'contentores', 'configuracoes'];

export function NotificacoesBell(): React.JSX.Element {
  const { navigate } = useNavigation();
  const [open, setOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Notificações"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="relative flex h-8 w-8 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
      >
        <Bell size={18} />
        {naoLidas > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-error px-1 text-[9px] font-semibold text-white">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-surface border border-border bg-bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-[13px] font-semibold text-text-primary">Notificações</span>
            <button
              type="button"
              onClick={() => void handleLimpar()}
              className="text-[12px] font-medium text-primary hover:underline"
            >
              Limpar
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="px-3 py-6 text-center text-[13px] text-text-tertiary">Nenhuma notificação.</p>
            ) : (
              notificacoes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void handleClickNotificacao(n)}
                  className={`flex w-full items-start gap-2 border-b border-border px-3 py-2.5 text-left last:border-b-0 transition-colors hover:bg-bg-app ${
                    n.lida ? 'opacity-60' : ''
                  }`}
                >
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-pill ${TIPO_COR[n.tipo]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-text-primary">{n.titulo}</span>
                    {n.mensagem ? <span className="block truncate text-[11px] text-text-tertiary">{n.mensagem}</span> : null}
                    <span className="block text-[10px] text-text-tertiary">{formatRelativo(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
