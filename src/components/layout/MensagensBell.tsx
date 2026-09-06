import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CaretLeft, Envelope, PaperPlaneTilt as Send } from '@phosphor-icons/react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { toast } from '@/components/ui/Toast';
import { cleanIpcError } from '@/lib/cleanIpcError';
import { ipcService } from '@/services/ipcService';
import { useAvatarPorUsuario } from '@/hooks/useAvatarPorUsuario';
import type { Mensagem, ThreadMensagemNaoLida } from '@/types';

function formatHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

// Envelope simples com badge vermelho — sem texto ao lado, para não
// competir por espaço com o resto do cabeçalho (era um pill grande com
// "N mensagens" escrito). Clicar expande a lista de conversas por ler;
// clicar numa conversa não navega para lado nenhum — o mesmo dropdown
// vira o chat, com histórico e campo de resposta, para responder sem
// perder o contexto de onde se estava na app.
export function MensagensBell(): React.JSX.Element | null {
  const [total, setTotal] = useState(0);
  const [threads, setThreads] = useState<ThreadMensagemNaoLida[] | null>(null);
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const [conversaCom, setConversaCom] = useState<ThreadMensagemNaoLida | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregandoConversa, setCarregandoConversa] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [mensagens]);

  function handleToggle(): void {
    const next = !open;
    setOpen(next);
    if (next) {
      setConversaCom(null);
      void ipcService.mensagens.listarThreadsComNaoLidas().then(setThreads);
    }
  }

  function abrirConversa(thread: ThreadMensagemNaoLida): void {
    setConversaCom(thread);
    setTexto('');
    setCarregandoConversa(true);
    ipcService.mensagens
      .listarConversa(thread.userId)
      .then(setMensagens)
      .catch((err: unknown) => toast.error(cleanIpcError(err)))
      .finally(() => setCarregandoConversa(false));
    // Abrir a conversa já conta como "ler" — desconta na hora, sem
    // esperar pelo próximo poll de 60s, e atualiza a lista de threads.
    void ipcService.mensagens.marcarLidas(thread.userId).then(() => {
      window.dispatchEvent(new Event('mensagens:atualizada'));
      void ipcService.mensagens.listarThreadsComNaoLidas().then(setThreads);
    });
  }

  async function handleEnviar(): Promise<void> {
    if (!conversaCom || !texto.trim()) return;
    setEnviando(true);
    try {
      await ipcService.mensagens.enviar(conversaCom.userId, texto);
      setTexto('');
      const dados = await ipcService.mensagens.listarConversa(conversaCom.userId);
      setMensagens(dados);
    } catch (err) {
      toast.error(cleanIpcError(err));
    } finally {
      setEnviando(false);
    }
  }

  if (total === 0) return null;

  return (
    <div ref={ref} className="relative z-[90]">
      <button
        type="button"
        onClick={handleToggle}
        title={`${total} mensagem${total === 1 ? '' : 's'} por ler`}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="relative flex h-9 w-9 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-[var(--toolbar-hover)]"
      >
        <Envelope size={18} weight="bold" />
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
          {total > 99 ? '99+' : total}
        </span>
      </button>

      {open && dropdownPos ? createPortal(
        <div
          id="mensagens-portal"
          className="fixed z-[100] flex w-80 flex-col overflow-hidden rounded-surface border border-border bg-bg-surface shadow-lg"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          {conversaCom ? (
            <>
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <button
                  type="button"
                  onClick={() => setConversaCom(null)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
                >
                  <CaretLeft size={15} />
                </button>
                <UserAvatar avatar={avatarPorUsuario.get(conversaCom.userId)} size={22} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text-primary">{conversaCom.nome}</span>
              </div>

              <div ref={listRef} className="flex max-h-72 min-h-[160px] flex-col gap-2 overflow-y-auto p-3">
                {carregandoConversa ? (
                  <p className="text-[13px] text-text-tertiary">A carregar...</p>
                ) : mensagens.length === 0 ? (
                  <p className="text-[13px] text-text-tertiary">Ainda não há mensagens com {conversaCom.nome}.</p>
                ) : (
                  mensagens.map((m) => {
                    const enviadaPelaEmpresa = m.deUserId !== conversaCom.userId;
                    return (
                      <div key={m.id} className={`flex ${enviadaPelaEmpresa ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-control px-3 py-2 text-[13px] ${
                            enviadaPelaEmpresa ? 'bg-primary text-white' : 'bg-bg-app text-text-primary'
                          }`}
                        >
                          <p>{m.texto}</p>
                          <p className={`mt-0.5 text-[10px] ${enviadaPelaEmpresa ? 'text-white/70' : 'text-text-tertiary'}`}>
                            {formatHora(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center gap-2 border-t border-border p-2">
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleEnviar();
                  }}
                  placeholder="Escreve uma mensagem..."
                  className="min-h-[36px] flex-1 rounded-control border border-border bg-bg-input px-2.5 text-[13px] text-text-primary outline-none focus:border-primary"
                />
                <button
                  type="button"
                  disabled={enviando || !texto.trim()}
                  onClick={() => void handleEnviar()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          ) : (
            <>
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
                      onClick={() => abrirConversa(t)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-bg-app"
                    >
                      <UserAvatar avatar={avatarPorUsuario.get(t.userId)} size={22} />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary">{t.nome}</span>
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-pill bg-error px-1 text-[10px] font-semibold text-white">
                        {t.total}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>,
        document.body
      ) : null}
    </div>
  );
}
