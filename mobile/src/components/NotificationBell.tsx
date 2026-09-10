import { useCallback, useEffect, useRef, useState } from 'react';
import { Warning as AlertTriangle, Bell, CheckCircle as CheckCircle2, Tray as Inbox, ChatCircle as MessageCircle, XCircle, type Icon as LucideIcon } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { useTheme } from '@/hooks/useTheme';
import { useNotificationPanel } from '@/hooks/useNotificationPanel';
import { estiloTema } from '@/lib/themeTokens';
import { corTextoSobre } from '@/lib/rowAccents';
import { listMinhasCargasPendentes, listMensagens, marcarMensagemLida } from '@/lib/data';
import { cargaNotificacaoVista, marcarCargaNotificacaoVista } from '@/lib/notificacoesVistas';
import { lerPreferenciasNotificacoes } from '@/lib/preferenciasNotificacoes';
import { formatRelativo } from '@/lib/formatRelativo';
import { MensagensTab } from './MensagensTab';
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

// Título curto por categoria — a pílula da dynamic island mostra isto (não
// só um número), para dar contexto de relance ("Carga sincronizada" em vez
// de só "1"). Continua a ser um título fixo por categoria, não o texto
// completo do item (esse só aparece já dentro do painel).
const TITULO_TIPO: Record<TipoNotificacao, string> = {
  carga_importada: 'Carga sincronizada',
  carga_rejeitada: 'Carga rejeitada',
  mensagem: 'Nova mensagem',
  fila_erro: 'Falha ao enviar',
};

const POLL_MS = 60_000;

interface NotificationBellProps {
  // Posição fixa (string CSS para `top`) em vez de medir o próprio botão
  // — o gatilho é só um pedaço pequeno dentro da ilha, e o painel precisa
  // de encostar exatamente ao fundo da ilha inteira, não do botão. Sem
  // gap, sem borda — para parecer que a ilha "cresceu" para virar o
  // painel, um único bloco, não dois.
  fixedTop: string;
  // Quando a zona do meio da ilha já está ocupada com controlos da página
  // (ex: Cargas), não há espaço para a pílula com título a alternar — usa
  // sempre o gatilho ícone+ponto, mesmo havendo notificações por ver.
  compacta?: boolean;
}

export function NotificationBell({ fixedTop, compacta }: NotificationBellProps): React.JSX.Element {
  const { pwaUser } = useAuth();
  const { navigate } = useNavigation();
  const { fila } = useFilaOffline();
  // Mesmo padrão de inversão de tema do popup Nova Carga e da dock — o
  // menu destaca-se sempre do fundo da app, em qualquer tema.
  const { theme } = useTheme();
  const temaInvertido = theme === 'dark' ? 'light' : 'dark';
  const { open, aba, abrir, fechar, setAba } = useNotificationPanel();
  const [cargas, setCargas] = useState<CargaPendente[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  // localStorage não é reativo — incrementar isto força reavaliar
  // `cargaNotificacaoVista` depois de marcar uma notificação como vista.
  const [, setVistasBump] = useState(0);
  // Gatilho 'compact': uma só pílula, maior, que alterna entre as
  // categorias com itens por ver (em vez de várias pílulas lado a lado a
  // disputar o pouco espaço da dynamic island).
  const [cicloIndex, setCicloIndex] = useState(0);
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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) fechar();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fechar]);

  // 'carga_rejeitada' e 'fila_erro' nunca são filtrados — informação
  // crítica que precisa de ação do próprio utilizador, não desligável.
  const prefs = lerPreferenciasNotificacoes();
  const cargasResolvidas = cargas.filter(
    (c) =>
      (c.estado === 'importada' || c.estado === 'rejeitada') &&
      !cargaNotificacaoVista(c.id) &&
      (c.estado !== 'importada' || prefs.carga_importada),
  );
  const mensagensNaoLidas = prefs.mensagem ? mensagens.filter((m) => !m.lida && m.paraUserId === pwaUser?.id) : [];
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

  // Para o gatilho 'compact' (dentro da dynamic island): uma só pílula,
  // maior, que alterna entre as categorias com itens por ver — cada uma
  // com o seu ícone/cor — em vez de várias pílulas pequenas lado a lado.
  const contagemPorTipo = itens.reduce<Partial<Record<TipoNotificacao, number>>>((acc, item) => {
    acc[item.tipo] = (acc[item.tipo] ?? 0) + 1;
    return acc;
  }, {});
  // Pílula com cor cheia (não tint a 20%) — consistente com o resto da app
  // depois da passagem para "blocos de cor vivos"; o contraste do texto é
  // sempre calculado, nunca fixo, para se ler bem em qualquer uma das 4 cores.
  const CORES_TIPO: Record<TipoNotificacao, string> = {
    carga_importada: '#17c964',
    carga_rejeitada: '#f31260',
    mensagem: '#006fee',
    fila_erro: '#f5a524',
  };
  const tiposAtivos = (Object.keys(ICONE_TIPO) as TipoNotificacao[]).filter((tipo) => contagemPorTipo[tipo]);

  useEffect(() => {
    if (tiposAtivos.length < 2) {
      setCicloIndex(0);
      return;
    }
    const timer = setInterval(() => setCicloIndex((i) => (i + 1) % tiposAtivos.length), 2200);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiposAtivos.length]);

  const tipoEmDestaque = tiposAtivos[cicloIndex % tiposAtivos.length];

  function handleTap(item: NotificacaoItem): void {
    if (item.tipo === 'carga_importada' || item.tipo === 'carga_rejeitada') {
      marcarCargaNotificacaoVista(item.id);
      setVistasBump((v) => v + 1);
      fechar();
      navigate('cargas');
    } else if (item.tipo === 'mensagem') {
      void marcarMensagemLida(item.id).then(() => setMensagens((prev) => prev.map((m) => (m.id === item.id ? { ...m, lida: true } : m))));
      setAba('mensagens');
    } else {
      fechar();
      navigate('cargas');
    }
  }

  return (
    <div ref={containerRef} className="relative z-40">
      {!compacta && total > 0 && tipoEmDestaque ? (
        <button type="button" onClick={() => (open ? fechar() : abrir())} title="Notificações" className="overflow-hidden">
          {/* key={tipoEmDestaque} força remount a cada troca — a transição
              de entrada (fade + leve deslize) corre outra vez sozinha,
              dando o efeito de "intercalar" entre categorias. */}
          <span
            key={tipoEmDestaque}
            style={{ backgroundColor: CORES_TIPO[tipoEmDestaque], color: corTextoSobre(CORES_TIPO[tipoEmDestaque]) }}
            className="flex h-8 max-w-full animate-[pilula-in_0.25s_ease-out] items-center gap-1.5 rounded-pill px-3"
          >
            {(() => {
              const Icone = ICONE_TIPO[tipoEmDestaque];
              return <Icone size={15} weight="fill" className="shrink-0" />;
            })()}
            <span className="truncate text-[12.5px] font-semibold leading-tight">{TITULO_TIPO[tipoEmDestaque]}</span>
            {(contagemPorTipo[tipoEmDestaque] ?? 0) > 1 ? (
              <span className="shrink-0 text-[11px] font-semibold opacity-80">{contagemPorTipo[tipoEmDestaque]}</span>
            ) : null}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => (open ? fechar() : abrir())}
          title="Notificações"
          className="relative flex h-7 w-7 items-center justify-center text-white/90"
        >
          <Bell size={18} />
          {total > 0 ? <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-error" /> : null}
        </button>
      )}

      {open ? (
        <div
          data-theme={temaInvertido}
          style={{ top: fixedTop, transformOrigin: 'top', ...estiloTema(temaInvertido) }}
          className="fixed inset-x-4 z-50 flex max-h-[70vh] animate-[island-menu-in_0.2s_ease-out] flex-col overflow-hidden rounded-b-surface bg-bg-surface shadow-medium"
        >
          <div className="flex shrink-0 items-center gap-1.5 border-b border-border p-2">
            <button
              type="button"
              onClick={() => setAba('notificacoes')}
              style={aba === 'notificacoes' ? { backgroundColor: '#006fee', color: '#ffffff' } : undefined}
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-control text-[12.5px] font-semibold ${
                aba === 'notificacoes' ? '' : 'text-text-tertiary'
              }`}
            >
              <Bell size={14} /> Notificações
              {total > 0 ? <span className={`text-[11px] font-normal ${aba === 'notificacoes' ? 'opacity-80' : 'text-text-tertiary'}`}>{total}</span> : null}
            </button>
            <button
              type="button"
              onClick={() => setAba('mensagens')}
              style={aba === 'mensagens' ? { backgroundColor: '#006fee', color: '#ffffff' } : undefined}
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-control text-[12.5px] font-semibold ${
                aba === 'mensagens' ? '' : 'text-text-tertiary'
              }`}
            >
              <MessageCircle size={14} /> Mensagens
            </button>
          </div>

          {aba === 'mensagens' ? (
            <MensagensTab />
          ) : (
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
          )}
        </div>
      ) : null}
    </div>
  );
}
