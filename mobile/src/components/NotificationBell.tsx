import { useCallback, useEffect, useRef, useState } from 'react';
import { Warning as AlertTriangle, Bell, CheckCircle as CheckCircle2, Tray as Inbox, ChatCircle as MessageCircle, XCircle, type Icon as LucideIcon } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { useTheme } from '@/hooks/useTheme';
import { estiloTema } from '@/lib/themeTokens';
import { listMinhasCargasPendentes, listMensagens, marcarMensagemLida } from '@/lib/data';
import { cargaNotificacaoVista, marcarCargaNotificacaoVista } from '@/lib/notificacoesVistas';
import { formatRelativo } from '@/lib/formatRelativo';
import type { CargaPendente, Mensagem } from '@/types';

type TipoNotificacao = 'carga_importada' | 'carga_rejeitada' | 'mensagem' | 'fila_erro';

interface NotificacaoItem {
  id: string;
  tipo: TipoNotificacao;
  texto: string;
  createdAt: string;
}

const ICONE_TIPO: Record<TipoNotificacao, LucideIcon> = {
  carga_importada: CheckCircle2,
  carga_rejeitada: XCircle,
  mensagem: MessageCircle,
  fila_erro: AlertTriangle,
};

const COR_TIPO: Record<TipoNotificacao, string> = {
  carga_importada: 'text-success',
  carga_rejeitada: 'text-error',
  mensagem: 'text-primary',
  fila_erro: 'text-warning',
};

const POLL_MS = 60_000;

export function NotificationBell(): React.JSX.Element {
  const { pwaUser } = useAuth();
  const { navigate } = useNavigation();
  const { fila } = useFilaOffline();
  // Mesmo padrão de inversão de tema do popup Nova Carga e da dock — o
  // menu destaca-se sempre do fundo da app, em qualquer tema.
  const { theme } = useTheme();
  const temaInvertido = theme === 'dark' ? 'light' : 'dark';
  const [cargas, setCargas] = useState<CargaPendente[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [open, setOpen] = useState(false);
  // localStorage não é reativo — incrementar isto força reavaliar
  // `cargaNotificacaoVista` depois de marcar uma notificação como vista.
  const [, setVistasBump] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  // O sino nem sempre está encostado ao canto direito do ecrã (na Home
  // divide a barra com o seletor de contentor) — um popup `absolute
  // right-0` ancorado ao botão ficava, nesses casos, a abrir mais para a
  // esquerda do que cabia no ecrã, escondendo as opções. `fixed` +
  // `right-4` prende sempre ao canto do ecrã; só o `top` precisa de ser
  // calculado (a barra de topo tem alturas diferentes consoante a página).
  const [popupTop, setPopupTop] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setPopupTop(rect.bottom + 8);
  }, [open]);

  const carregar = useCallback(() => {
    listMinhasCargasPendentes()
      .then(setCargas)
      .catch(() => undefined);
    listMensagens()
      .then(setMensagens)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, POLL_MS);
    return () => clearInterval(timer);
  }, [carregar]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cargasResolvidas = cargas.filter(
    (c) => (c.estado === 'importada' || c.estado === 'rejeitada') && !cargaNotificacaoVista(c.id),
  );
  const mensagensNaoLidas = mensagens.filter((m) => !m.lida && m.paraUserId === pwaUser?.id);
  const filaComErro = fila.filter((f) => f.estado === 'erro');

  const itens: NotificacaoItem[] = [
    ...cargasResolvidas.map((c) => ({
      id: c.id,
      tipo: (c.estado === 'importada' ? 'carga_importada' : 'carga_rejeitada') as TipoNotificacao,
      texto:
        c.estado === 'importada'
          ? `Carga "${c.nomeCarga}" foi importada.`
          : `Carga "${c.nomeCarga}" foi rejeitada${c.motivoRejeicao ? `: ${c.motivoRejeicao}` : '.'}`,
      createdAt: c.importadoEm ?? c.createdAt,
    })),
    ...mensagensNaoLidas.map((m) => ({
      id: m.id,
      tipo: 'mensagem' as TipoNotificacao,
      texto: `Nova mensagem: ${m.texto}`,
      createdAt: m.createdAt,
    })),
    ...filaComErro.map((f) => ({
      id: f.id,
      tipo: 'fila_erro' as TipoNotificacao,
      texto: `Falha ao enviar "${f.item.nomeCarga}"${f.ultimoErro ? `: ${f.ultimoErro}` : '.'}`,
      createdAt: f.criadoEm,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = itens.length;

  function handleTap(item: NotificacaoItem): void {
    setOpen(false);
    if (item.tipo === 'carga_importada' || item.tipo === 'carga_rejeitada') {
      marcarCargaNotificacaoVista(item.id);
      setVistasBump((v) => v + 1);
      navigate('cargas');
    } else if (item.tipo === 'mensagem') {
      void marcarMensagemLida(item.id).then(() => setMensagens((prev) => prev.map((m) => (m.id === item.id ? { ...m, lida: true } : m))));
      navigate('mensagens');
    } else {
      navigate('cargas');
    }
  }

  return (
    <div ref={containerRef} className="relative z-40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Notificações"
        className="relative flex h-9 w-9 items-center justify-center rounded-control text-text-secondary active:bg-bg-app"
      >
        <Bell size={20} />
        {total > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-error px-1 text-[10px] font-semibold leading-none text-white">
            {total > 9 ? '9+' : total}
          </span>
        ) : null}
      </button>

      {open && popupTop != null ? (
        <div
          data-theme={temaInvertido}
          style={{ top: popupTop, ...estiloTema(temaInvertido) }}
          className="fixed right-4 z-50 flex max-h-[70vh] w-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-surface border border-border bg-bg-surface shadow-medium"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-3.5 py-2.5">
            <span className="text-[13px] font-semibold text-text-primary">Notificações</span>
            {total > 0 ? <span className="text-[11px] text-text-tertiary">{total} por ver</span> : null}
          </div>

          <div className="flex-1 overflow-y-auto">
            {itens.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <Inbox size={22} className="text-text-tertiary" />
                <p className="text-[13px] text-text-tertiary">Sem notificações novas.</p>
              </div>
            ) : (
              itens.map((item) => {
                const Icone = ICONE_TIPO[item.tipo];
                return (
                  <button
                    key={`${item.tipo}-${item.id}`}
                    type="button"
                    onClick={() => handleTap(item)}
                    className="flex w-full items-start gap-2.5 border-b border-border px-3.5 py-2.5 text-left last:border-b-0 active:bg-bg-app"
                  >
                    <Icone size={16} className={`mt-0.5 shrink-0 ${COR_TIPO[item.tipo]}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-text-primary">{item.texto}</span>
                      <span className="text-[11px] text-text-tertiary">{formatRelativo(item.createdAt)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('mensagens');
            }}
            className="flex min-h-touch shrink-0 items-center justify-center gap-1.5 border-t border-border text-[13px] font-medium text-primary active:bg-bg-app"
          >
            <MessageCircle size={15} /> Ver todas as mensagens
          </button>
        </div>
      ) : null}
    </div>
  );
}
