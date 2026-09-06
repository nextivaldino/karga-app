import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Envelope } from '@phosphor-icons/react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { ipcService } from '@/services/ipcService';
import { useAvatarPorUsuario } from '@/hooks/useAvatarPorUsuario';
import { useNavigation } from '@/hooks/useNavigation';
import type { ThreadMensagemNaoLida } from '@/types';

export function MensagensBell(): React.JSX.Element | null {
  const { navigate } = useNavigation();
  const [total, setTotal] = useState(0);
  const [threads, setThreads] = useState<ThreadMensagemNaoLida[] | null>(null);
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const avatarPorUsuario = useAvatarPorUsuario();

  async function carregarTotal(): Promise<void> {
    const n = await ipcService.mensagens.contarNaoLidas();
    setTotal(n);
  }

  useEffect(() => {
    void carregarTotal();
    const interval = setInterval(() => void carregarTotal(), 60_000);
    const onAtualizada = (): void => void carregarTotal();
    window.addEventListener('mensagens:atualizada', onAtualizada);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mensagens:atualizada', onAtualizada);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // also check if click is inside the portal
        const portal = document.getElementById('mensagens-portal');
        if (portal && portal.contains(e.target as Node)) return;
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function updatePos(): void {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      setDropdownPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    updatePos();
    window.addEventListener('resize', updatePos);
    return () => window.removeEventListener('resize', updatePos);
  }, [open]);

  function handleToggle(): void {
    const next = !open;
    setOpen(next);
    if (next) void ipcService.mensagens.listarThreadsComNaoLidas().then(setThreads);
  }

  if (total === 0) return null;

  return (
    <div ref={ref} className="relative z-[90]">
      <button
        type="button"
        onClick={handleToggle}
        title={`${total} mensagem${total === 1 ? '' : 's'} por ler`}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="flex h-9 items-center gap-1.5 rounded-pill bg-warning/15 px-2.5 text-warning transition-transform hover:scale-105"
      >
        <Envelope size={16} weight="bold" />
        <span className="whitespace-nowrap text-[11px] font-bold">
          {total > 99 ? '99+' : total} mensage{total === 1 ? 'm' : 'ns'}
        </span>
      </button>

      {open && dropdownPos ? createPortal(
        <div id="mensagens-portal" className="fixed z-[100] w-72 overflow-hidden rounded-surface border border-border bg-bg-surface shadow-lg" style={{ top: dropdownPos.top, right: dropdownPos.right }}>
          <div className="border-b border-border px-3 py-2 text-[13px] font-semibold text-text-primary">Mensagens por ler</div>
          <div className="max-h-72 overflow-y-auto py-1">
            {threads == null ? (
              <p className="px-3 py-4 text-center text-[13px] text-text-tertiary">A carregar...</p>
            ) : threads.length === 0 ? (
              <p className="px-3 py-4 text-center text-[13px] text-text-tertiary">Nada por ler.</p>
            ) : (
              threads.map((t) => (
                <button
                  key={t.userId}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate('configuracoes', { mensagemDeUserId: t.userId });
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-bg-app"
                >
                  <UserAvatar avatar={avatarPorUsuario.get(t.userId)} size={22} />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary">{t.nome}</span>
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-pill bg-warning px-1 text-[10px] font-semibold text-white">
                    {t.total}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}

