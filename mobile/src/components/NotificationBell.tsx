import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Inbox } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';
import { useFilaOffline } from '@/hooks/useFilaOffline';
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

const POLL_MS = 60_000;

export function NotificationBell(): React.JSX.Element {
  const { pwaUser } = useAuth();
  const { navigate } = useNavigation();
  const { fila } = useFilaOffline();
  const [cargas, setCargas] = useState<CargaPendente[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [open, setOpen] = useState(false);
  // localStorage não é reativo — incrementar isto força reavaliar
  // `cargaNotificacaoVista` depois de marcar uma notificação como vista.
  const [, setVistasBump] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div ref={containerRef} className="relative">
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

      {open ? (
        <div className="absolute right-0 top-11 z-50 max-h-96 w-72 overflow-y-auto rounded-surface border border-border bg-bg-surface shadow-lg">
          {itens.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <Inbox size={24} className="text-text-tertiary" />
              <p className="text-[13px] text-text-tertiary">Sem notificações novas.</p>
            </div>
          ) : (
            itens.map((item) => (
              <button
                key={`${item.tipo}-${item.id}`}
                type="button"
                onClick={() => handleTap(item)}
                className="flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-3 text-left last:border-b-0 active:bg-bg-app"
              >
                <span className="text-[13px] text-text-primary">{item.texto}</span>
                <span className="text-[11px] text-text-tertiary">{formatRelativo(item.createdAt)}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
