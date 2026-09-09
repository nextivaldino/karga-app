import { useEffect, useRef, useState } from 'react';
import { CaretLeft, Envelope, MagnifyingGlass as Search } from '@phosphor-icons/react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { ChatConversa } from '@/modules/mensagens/ChatConversa';
import { ipcService } from '@/services/ipcService';
import { useAvatarPorUsuario } from '@/hooks/useAvatarPorUsuario';
import type { ConversaResumo } from '@/types';

function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Hora se for hoje, "Ontem", ou dia/mês curto — estilo WhatsApp na lista
// de conversas (diferente do separador de data dentro da conversa, que
// mostra o rótulo completo).
function formatHoraLista(iso: string): string {
  const data = new Date(iso);
  const hoje = new Date();
  if (mesmoDia(data, hoje)) {
    return new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }).format(data);
  }
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (mesmoDia(data, ontem)) return 'Ontem';
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit' }).format(data);
}

// Segmento da barra de estado, estilo bandeja do Windows 7 (relógio/rede/
// volume) — em repouso é um item discreto de texto, igual aos outros da
// barra; assim que há mensagens por ler, esse segmento fica azul, com
// badge e um pequeno pulso, sem competir visualmente com o resto da app
// (a versão anterior, um balão flutuante grande, não encaixava bem nesta
// interface). Clicar abre a lista de conversas estilo WhatsApp (todos os
// utilizadores PWA) a partir desse mesmo segmento, para cima; clicar numa
// conversa vira chat inline.
export function MensagensBell(): React.JSX.Element {
  const [total, setTotal] = useState(0);
  const [conversas, setConversas] = useState<ConversaResumo[] | null>(null);
  const [open, setOpen] = useState(false);
  const [conversaCom, setConversaCom] = useState<ConversaResumo | null>(null);
  const [busca, setBusca] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const avatarPorUsuario = useAvatarPorUsuario();

  async function carregarTotal(): Promise<void> {
    const n = await ipcService.mensagens.contarNaoLidas();
    setTotal(n);
  }

  function carregarConversas(): void {
    void ipcService.mensagens.listarConversas().then(setConversas);
  }

  useEffect(() => {
    void carregarTotal();
    const interval = setInterval(() => void carregarTotal(), 60_000);
    const onAtualizada = (): void => {
      void carregarTotal();
      carregarConversas();
    };
    window.addEventListener('mensagens:atualizada', onAtualizada);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mensagens:atualizada', onAtualizada);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function handleToggle(): void {
    const next = !open;
    setOpen(next);
    if (next) {
      setConversaCom(null);
      setBusca('');
      carregarConversas();
    }
  }

  function voltarLista(): void {
    setConversaCom(null);
    carregarConversas();
  }

  const termo = busca.trim().toLowerCase();
  const conversasFiltradas = (conversas ?? []).filter((c) => !termo || c.nome.toLowerCase().includes(termo));
  const temNaoLidas = total > 0;

  return (
    <div ref={ref} className="relative z-[95] flex h-full items-stretch">
      {open ? (
        <div className="absolute bottom-full right-0 mb-2 flex h-[420px] w-96 flex-col overflow-hidden rounded-surface border border-border bg-bg-surface shadow-2xl">
          {conversaCom ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
                <button
                  type="button"
                  onClick={voltarLista}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-app"
                >
                  <CaretLeft size={15} />
                </button>
                <UserAvatar avatar={avatarPorUsuario.get(conversaCom.userId)} size={26} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text-primary">{conversaCom.nome}</span>
              </div>
              <ChatConversa contraparteId={conversaCom.userId} nome={conversaCom.nome} className="flex-1" />
            </>
          ) : (
            <>
              <div className="shrink-0 border-b border-border p-2.5">
                <div className="flex h-8 items-center gap-2 rounded-control border border-border bg-bg-input px-2.5">
                  <Search size={13} className="shrink-0 text-text-tertiary" />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Pesquisar conversas..."
                    className="h-full flex-1 bg-transparent text-[12px] text-text-primary outline-none placeholder:text-text-tertiary"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {conversas == null ? (
                  <p className="px-3 py-4 text-center text-[13px] text-text-tertiary">A carregar...</p>
                ) : conversasFiltradas.length === 0 ? (
                  <p className="px-3 py-4 text-center text-[13px] text-text-tertiary">
                    {termo ? `Nenhuma conversa com "${busca}".` : 'Nenhum utilizador com acesso PWA.'}
                  </p>
                ) : (
                  conversasFiltradas.map((c) => (
                    <button
                      key={c.userId}
                      type="button"
                      onClick={() => setConversaCom(c)}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-bg-app"
                    >
                      <UserAvatar avatar={avatarPorUsuario.get(c.userId)} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-text-primary">{c.nome}</p>
                        <p className="truncate text-[12px] text-text-tertiary">
                          {c.ultimaMensagemTexto ? (
                            <>
                              {c.ultimaMensagemDeEmpresa ? 'Tu: ' : ''}
                              {c.ultimaMensagemTexto}
                            </>
                          ) : (
                            <span className="italic">Iniciar conversa</span>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {c.ultimaMensagemEm ? (
                          <span className="text-[10px] text-text-tertiary">{formatHoraLista(c.ultimaMensagemEm)}</span>
                        ) : null}
                        {c.naoLidas > 0 ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-primary px-1 text-[10px] font-semibold text-white">
                            {c.naoLidas}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleToggle}
        title={temNaoLidas ? `${total} mensagem${total === 1 ? '' : 's'} por ler` : 'Mensagens'}
        className={`flex h-full w-96 items-center justify-center gap-1.5 px-3 text-[10.5px] tracking-wide transition-colors ${
          temNaoLidas ? 'bg-primary text-white' : 'text-text-tertiary hover:bg-[var(--toolbar-hover)]'
        }`}
      >
        <span className="relative flex shrink-0 items-center justify-center">
          <Envelope size={12} weight={temNaoLidas ? 'fill' : 'regular'} />
          {temNaoLidas ? (
            <span className="absolute -right-1 -top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-white shadow-[0_0_4px_1px_rgba(255,255,255,0.8)]" />
          ) : null}
        </span>
        <span>{temNaoLidas ? `${total > 99 ? '99+' : total} mensagem${total === 1 ? '' : 's'}` : 'Mensagens'}</span>
      </button>
    </div>
  );
}
