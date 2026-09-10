import { useEffect, useState } from 'react';
import { Warning as AlertTriangle, ChatCircle as MessageCircle, CheckCircle as CheckCircle2, Clock, CurrencyEur as Euro, Package } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { useNotificationPanel } from '@/hooks/useNotificationPanel';
import { useTheme } from '@/hooks/useTheme';
import { corTextoSobre } from '@/lib/rowAccents';
import { listMinhasCargasPendentes, listMensagens } from '@/lib/data';
import { toast } from '@/components/ui/Toast';
import { PullToRefresh } from '@/components/PullToRefresh';
import type { CargaPendente, Mensagem } from '@/types';

function formatMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor);
}

// Hex cru dos mesmos tokens semânticos de theme.css — precisos aqui (não
// só a var CSS) porque os blocos de cor cheia precisam de calcular o
// contraste do texto por cima (`corTextoSobre`), o que exige o valor
// resolvido, não a variável.
const CORES = {
  warning: '#f5a524',
  primary: '#006fee',
  success: '#17c964',
  error: '#f31260',
};

export function HomePage(): React.JSX.Element {
  const { pwaUser } = useAuth();
  const { navigate } = useNavigation();
  const { abrir: abrirPainelNotificacoes } = useNotificationPanel();
  const { theme } = useTheme();
  const corPurple = theme === 'dark' ? '#9353d3' : '#7828c8';
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
      {/* Versão compacta, alinhada ao topo — sem hero centrado nem blur
          decorativo, para ficar mais perto da densidade da Home do
          Desktop (widgets pequenos em grelha) e do resto do próprio
          Mobile (Cargas/Definições já não têm decoração de fundo). */}
      <PullToRefresh onRefresh={recarregar} className="flex-1 overflow-y-auto px-4 py-3.5">
        {/* Sem saudação/nome do utilizador — só o bloco de cards, centrado
            no espaço disponível abaixo do cabeçalho. */}
        <div className="flex min-h-full flex-col">

        {/* Cards no mesmo padrão da Home do Desktop (widgets "Resumo do
            Sistema"): o próprio card é a cor pastel, ícone solto no topo
            (sem círculo/badge), valor grande, label pequena por baixo,
            tudo alinhado à esquerda, sem borda nem sombra. Grid de 3
            colunas iguais (não 2+1) — os 3 cards ficam com a mesma
            largura/altura, alinhados nos mesmos eixos X e Y, em vez do
            terceiro card ocupar a largura toda para pouco conteúdo. */}
        <div className="flex flex-1 flex-col justify-center gap-2">
          {/* flex+justify-center em vez de grid-cols-3: os cards têm
              largura fixa e pequena, não esticam até às bordas — ficam
              como um bloco compacto centrado, com espaço visível dos
              dois lados. */}
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => navigate('cargas')}
              style={{ backgroundColor: CORES.warning, color: corTextoSobre(CORES.warning) }}
              className="flex w-28 shrink-0 flex-col items-start gap-1.5 rounded-surface p-4 text-left transition-transform active:scale-[0.98]"
            >
              <Package size={16} weight="duotone" />
              <span className="text-[28px] font-bold leading-none tabular-nums">{cargasSemana}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">cargas/semana</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('cargas')}
              style={{ backgroundColor: CORES.primary, color: corTextoSobre(CORES.primary) }}
              className="flex w-28 shrink-0 flex-col items-start gap-1.5 rounded-surface p-4 text-left transition-transform active:scale-[0.98]"
            >
              <Euro size={16} weight="duotone" />
              <span className="w-full truncate text-[28px] font-bold leading-none tabular-nums">{formatMoeda(valorMes)}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">este mês</span>
            </button>

            {/* Atalho direto para Mensagens — sempre visível (não só quando
                há não lidas), já que o Dock deixou de ter um ícone próprio
                para isto (doc 20, superado) e chegar lá pelo sino exigia 2
                toques. Mesmo formato dos outros 2 cards. */}
            <button
              type="button"
              onClick={() => abrirPainelNotificacoes('mensagens')}
              style={{ backgroundColor: corPurple, color: corTextoSobre(corPurple) }}
              className="flex w-28 shrink-0 flex-col items-start gap-1.5 rounded-surface p-4 text-left transition-transform active:scale-[0.98]"
            >
              <MessageCircle size={16} weight="duotone" />
              <span className="text-[28px] font-bold leading-none tabular-nums">{mensagensNaoLidas.length}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                {mensagensNaoLidas.length === 1 ? 'mensagem nova' : 'mensagens novas'}
              </span>
            </button>
          </div>

          {naFila > 0 ? (
            <button
              type="button"
              onClick={() => navigate('cargas')}
              style={{ backgroundColor: CORES.warning, color: corTextoSobre(CORES.warning) }}
              className="flex min-h-touch items-center gap-2.5 rounded-surface px-3 py-2.5 text-left"
            >
              <Clock size={16} weight="duotone" className="shrink-0" />
              <span className="text-[12.5px] font-medium">
                {naFila} carga{naFila === 1 ? '' : 's'} por enviar — vai{naFila === 1 ? '' : 'ão'} quando ficares online
              </span>
            </button>
          ) : null}

          {comErro > 0 ? (
            <button
              type="button"
              onClick={() => navigate('cargas')}
              style={{ backgroundColor: CORES.error, color: corTextoSobre(CORES.error) }}
              className="flex min-h-touch items-center gap-2.5 rounded-surface px-3 py-2.5 text-left"
            >
              <AlertTriangle size={16} weight="duotone" className="shrink-0" />
              <span className="text-[12.5px] font-medium">
                {comErro} carga{comErro === 1 ? '' : 's'} com falha ao enviar — toca para tentar de novo
              </span>
            </button>
          ) : null}

          {naFila === 0 && comErro === 0 ? (
            <div className="flex justify-center">
              <div
                style={{ backgroundColor: CORES.success, color: corTextoSobre(CORES.success) }}
                className="flex items-center gap-1.5 rounded-pill py-1.5 pl-2 pr-3.5"
              >
                <CheckCircle2 size={20} weight="fill" className="shrink-0" />
                <span className="text-[12px] font-semibold">Tudo sincronizado</span>
              </div>
            </div>
          ) : null}
        </div>
        </div>
      </PullToRefresh>
    </div>
  );
}
