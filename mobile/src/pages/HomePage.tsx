import { useEffect, useState } from 'react';
import { ArrowsClockwise, Warning as AlertTriangle, ChatCircle as MessageCircle, CheckCircle as CheckCircle2, Clock, CurrencyEur as Euro, Package, Stack as Layers, Boat as Ship } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { useContentorAtivo } from '@/hooks/useContentorAtivo';
import { listMinhasCargasPendentes, listMensagens } from '@/lib/data';
import { toast } from '@/components/ui/Toast';
import { NotificationBell } from '@/components/NotificationBell';
import { GearMenu } from '@/components/GearMenu';
import { PullToRefresh } from '@/components/PullToRefresh';
import { ContentorPickerSheet } from '@/components/ContentorPickerSheet';
import type { CargaPendente, Mensagem } from '@/types';

function formatMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor);
}

// Contentor ativo — por omissão resolvido pelo servidor (atribuído pelo
// Admin > padrão global > primeiro aberto), mas tocável: com vários
// contentores abertos em simultâneo, o utilizador pode escolher outro na
// folha de seleção. A cor do ícone diz se veio mesmo do servidor ou é a
// última cópia em cache; o botão de reconectar fica à parte, só serve
// para forçar uma nova tentativa de ligação.
function ContentorPredefinido(): React.JSX.Element | null {
  const { contentores, contentorAtivoId, ligado, aLigar, tentarLigar, selecionarContentor } = useContentorAtivo();
  const [seletorAberto, setSeletorAberto] = useState(false);
  const atual = contentores.find((c) => c.id === contentorAtivoId) ?? null;
  if (!atual) return null;

  return (
    <>
      <div className="flex min-h-touch min-w-0 flex-1 items-center gap-1.5 rounded-pill border border-border bg-bg-surface/80 px-1.5 shadow-soft backdrop-blur-md">
        <button
          type="button"
          onClick={() => setSeletorAberto(true)}
          className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-1 text-left"
        >
          <Layers size={15} className={`shrink-0 ${ligado ? 'text-success' : 'text-warning'}`} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-primary">{atual.codigo}</span>
        </button>
        {!ligado ? (
          <button
            type="button"
            onClick={() => void tentarLigar()}
            disabled={aLigar}
            title="Sem ligação ao servidor — a mostrar a última lista guardada. Toca para tentar de novo."
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-warning active:bg-warning/10 disabled:opacity-60"
          >
            <ArrowsClockwise size={13} className={aLigar ? 'animate-spin' : ''} />
          </button>
        ) : null}
      </div>

      <ContentorPickerSheet
        open={seletorAberto}
        onClose={() => setSeletorAberto(false)}
        contentores={contentores}
        contentorAtivoId={contentorAtivoId}
        onSelecionar={selecionarContentor}
      />
    </>
  );
}

export function HomePage(): React.JSX.Element {
  const { pwaUser } = useAuth();
  const { navigate } = useNavigation();
  const [cargas, setCargas] = useState<CargaPendente[]>([]);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState<Mensagem[]>([]);
  const { fila } = useFilaOffline();
  const naFila = fila.filter((f) => f.estado === 'fila').length;
  const comErro = fila.filter((f) => f.estado === 'erro').length;

  async function recarregar(): Promise<void> {
    try {
      const [cs, ms] = await Promise.all([listMinhasCargasPendentes(), listMensagens()]);
      setCargas(cs);
      setMensagensNaoLidas(ms.filter((m) => !m.lida && m.paraUserId === pwaUser?.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao carregar dados.');
    }
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pwaUser?.id]);

  const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const cargasSemana = cargas.filter((c) => new Date(c.createdAt).getTime() >= seteDiasAtras).length;

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime();
  const valorMes = cargas
    .filter((c) => new Date(c.createdAt).getTime() >= inicioMes)
    .reduce((soma, c) => soma + (c.valor ?? 0), 0);

  return (
    <div className="flex h-full flex-col">
      {/* Substitui a barra de topo genérica — a Home não precisa de uma
          tira própria com o título da página, só dos itens que ela traria
          (notificações, menu), aqui já integrados com a marca e o
          seletor de contentor. */}
      <div
        className="relative z-30 flex shrink-0 items-center gap-2 border-b border-border/60 bg-bg-header px-4 pb-2.5 backdrop-blur-xl"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}
      >
        <span className="shrink-0 text-[18px] font-bold tracking-tight text-text-primary">KARGA</span>
        <ContentorPredefinido />
        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell />
          <GearMenu />
        </div>
      </div>

      {/* Versão compacta, alinhada ao topo — sem hero centrado nem blur
          decorativo, para ficar mais perto da densidade da Home do
          Desktop (widgets pequenos em grelha) e do resto do próprio
          Mobile (Cargas/Definições já não têm decoração de fundo). */}
      <PullToRefresh onRefresh={recarregar} className="flex-1 overflow-y-auto px-4 py-3.5">
        <div className="mb-3.5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Ship size={17} weight="duotone" />
          </span>
          <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-text-primary">
            Olá, {pwaUser?.nome ?? '...'}
          </p>
        </div>

        {/* Cards no mesmo padrão da Home do Desktop (widgets "Resumo do
            Sistema"): o próprio card é a cor pastel, ícone solto no topo
            (sem círculo/badge), valor grande, label pequena por baixo,
            tudo alinhado à esquerda, sem borda nem sombra. */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigate('cargas')}
              className="flex flex-col items-start gap-1 rounded-surface bg-warning/10 p-3 text-left transition-transform active:scale-[0.98]"
            >
              <Package size={18} weight="duotone" className="text-warning" />
              <span className="text-[17px] font-bold tabular-nums text-text-primary">{cargasSemana}</span>
              <span className="text-[11px] text-text-secondary">cargas/semana</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('cargas')}
              className="flex flex-col items-start gap-1 rounded-surface bg-primary/10 p-3 text-left transition-transform active:scale-[0.98]"
            >
              <Euro size={18} weight="duotone" className="text-primary" />
              <span className="truncate text-[17px] font-bold tabular-nums text-text-primary">{formatMoeda(valorMes)}</span>
              <span className="text-[11px] text-text-secondary">este mês</span>
            </button>
          </div>

          {/* Atalho direto para Mensagens — sempre visível (não só quando há
              não lidas), já que o Dock deixou de ter um ícone próprio para
              isto (doc 20, superado) e chegar lá pelo sino exigia 2 toques.
              Mesmo formato dos cards de estatística (ícone > valor > label). */}
          <button
            type="button"
            onClick={() => navigate('mensagens')}
            className="flex flex-col items-start gap-1 rounded-surface bg-purple/10 p-3 text-left transition-transform active:scale-[0.98]"
          >
            <MessageCircle size={18} weight="duotone" className="text-purple" />
            <span className="text-[17px] font-bold tabular-nums text-text-primary">{mensagensNaoLidas.length}</span>
            <span className="text-[11px] text-text-secondary">
              {mensagensNaoLidas.length === 1 ? 'mensagem nova' : 'mensagens novas'}
            </span>
          </button>

          {naFila > 0 ? (
            <button
              type="button"
              onClick={() => navigate('cargas')}
              className="flex min-h-touch items-center gap-2.5 rounded-surface bg-warning/10 px-3 py-2.5 text-left"
            >
              <Clock size={16} weight="duotone" className="shrink-0 text-warning" />
              <span className="text-[12.5px] text-text-primary">
                {naFila} carga{naFila === 1 ? '' : 's'} por enviar — vai{naFila === 1 ? '' : 'ão'} quando ficares online
              </span>
            </button>
          ) : null}

          {comErro > 0 ? (
            <button
              type="button"
              onClick={() => navigate('cargas')}
              className="flex min-h-touch items-center gap-2.5 rounded-surface bg-error/10 px-3 py-2.5 text-left"
            >
              <AlertTriangle size={16} weight="duotone" className="shrink-0 text-error" />
              <span className="text-[12.5px] text-text-primary">
                {comErro} carga{comErro === 1 ? '' : 's'} com falha ao enviar — toca para tentar de novo
              </span>
            </button>
          ) : null}

          {naFila === 0 && comErro === 0 ? (
            <div className="flex min-h-touch items-center justify-center gap-2 rounded-surface bg-success/10 px-3 py-2.5">
              <CheckCircle2 size={14} weight="fill" className="shrink-0 text-success" />
              <span className="text-[11.5px] font-medium text-success">Tudo sincronizado — as tuas cargas já estão no sistema</span>
            </div>
          ) : null}
        </div>
      </PullToRefresh>
    </div>
  );
}
