import { useEffect, useRef, useState } from 'react';
import { CaretDown as ChevronDown, Warning as AlertTriangle, Bell, CheckCircle as CheckCircle2, Clock, CurrencyEur as Euro, Package, Stack as Layers, Boat as Ship } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { listContentoresDisponiveis, listMinhasCargasPendentes, listMensagens } from '@/lib/data';
import { getContentorAtivo, setContentorAtivo } from '@/lib/contentorAtivo';
import { toast } from '@/components/ui/Toast';
import { NotificationBell } from '@/components/NotificationBell';
import { GearMenu } from '@/components/GearMenu';
import type { CargaPendente, ContentorDisponivel, Mensagem } from '@/types';

function formatMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor);
}

// Contentor "ativo" — os que o admin liberou para este utilizador no
// Kraga Desktop (mesma fonte de dados que a Nova Carga já usa). Escolher
// aqui fica guardado e é o que a Nova Carga abre por omissão.
function SeletorContentor(): React.JSX.Element | null {
  const [contentores, setContentores] = useState<ContentorDisponivel[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listContentoresDisponiveis()
      .then((cs) => {
        setContentores(cs);
        const ativo = getContentorAtivo();
        setSelecionado(ativo && cs.some((c) => c.id === ativo) ? ativo : (cs[0]?.id ?? null));
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Falha ao carregar contentores.'));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (contentores.length === 0) return null;
  const atual = contentores.find((c) => c.id === selecionado) ?? contentores[0]!;

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-touch w-full items-center gap-1.5 rounded-pill border border-border bg-bg-surface/80 px-3 text-left shadow-soft backdrop-blur-md"
      >
        <Layers size={15} className="shrink-0 text-success" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-primary">{atual.codigo}</span>
        <ChevronDown size={13} className={`shrink-0 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="absolute left-0 top-11 z-30 w-56 overflow-hidden rounded-surface border border-border bg-bg-surface shadow-medium">
          {contentores.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelecionado(c.id);
                setContentorAtivo(c.id);
                setOpen(false);
              }}
              className={`flex min-h-touch w-full items-center gap-2 px-3 text-left text-[13px] ${
                c.id === atual.id ? 'bg-primary/15 font-medium text-primary' : 'text-text-primary active:bg-bg-app'
              }`}
            >
              <span className="font-medium">{c.codigo}</span>
              <span className="min-w-0 flex-1 truncate text-text-tertiary">{c.nome}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
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

  useEffect(() => {
    let cancelado = false;
    Promise.all([listMinhasCargasPendentes(), listMensagens()])
      .then(([cs, ms]) => {
        if (cancelado) return;
        setCargas(cs);
        setMensagensNaoLidas(ms.filter((m) => !m.lida && m.paraUserId === pwaUser?.id));
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Falha ao carregar dados.'));
    return () => {
      cancelado = true;
    };
  }, [pwaUser?.id]);

  const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const cargasSemana = cargas.filter((c) => new Date(c.createdAt).getTime() >= seteDiasAtras).length;

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime();
  const valorMes = cargas
    .filter((c) => new Date(c.createdAt).getTime() >= inicioMes)
    .reduce((soma, c) => soma + (c.valor ?? 0), 0);

  return (
    <div className="flex min-h-full flex-col">
      {/* Substitui a barra de topo genérica — a Home não precisa de uma
          tira própria com o título da página, só dos itens que ela traria
          (notificações, menu), aqui já integrados com a marca e o
          seletor de contentor. */}
      <div
        className="relative z-30 flex shrink-0 items-center gap-2 border-b border-border/60 bg-bg-header px-4 pb-2.5 backdrop-blur-xl"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}
      >
        <span className="shrink-0 text-[18px] font-bold tracking-tight text-text-primary">KARGA</span>
        <SeletorContentor />
        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell />
          <GearMenu />
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-10">
        <div className="pointer-events-none absolute -top-10 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-success/15 blur-3xl" />

        <span className="relative mb-2 text-[15px] font-medium text-text-secondary">Olá, {pwaUser?.nome ?? '...'} 👋</span>
        <span className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-primary text-white shadow-medium">
          <Ship size={28} weight="duotone" />
        </span>

        <div className="relative flex w-full max-w-[300px] flex-col gap-3">
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('cargas')}
              className="card-surface flex flex-1 flex-col items-center gap-1.5 px-3 py-4 text-center transition-transform active:scale-[0.98]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/15 text-warning">
                <Package size={17} weight="duotone" />
              </span>
              <span className="text-[20px] font-bold tabular-nums text-text-primary">{cargasSemana}</span>
              <span className="text-[11px] text-text-tertiary">cargas/semana</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('cargas')}
              className="card-surface flex flex-1 flex-col items-center gap-1.5 px-3 py-4 text-center transition-transform active:scale-[0.98]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Euro size={17} weight="duotone" />
              </span>
              <span className="text-[20px] font-bold tabular-nums text-text-primary">{formatMoeda(valorMes)}</span>
              <span className="text-[11px] text-text-tertiary">este mês</span>
            </button>
          </div>

          {mensagensNaoLidas.length > 0 ? (
            <button
              type="button"
              onClick={() => navigate('mensagens')}
              className="card-surface flex min-h-touch items-center gap-3 px-4 py-3 text-left transition-transform active:scale-[0.98]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple/15 text-purple">
                <Bell size={16} weight="duotone" />
              </span>
              <span className="text-[13px] font-medium text-text-primary">
                {mensagensNaoLidas.length} mensagem{mensagensNaoLidas.length === 1 ? '' : 's'} nova{mensagensNaoLidas.length === 1 ? '' : 's'}
              </span>
            </button>
          ) : null}

          {naFila > 0 ? (
            <button
              type="button"
              onClick={() => navigate('cargas')}
              className="flex min-h-touch items-center gap-3 rounded-surface border border-warning/25 bg-warning/10 px-4 py-3 text-left shadow-soft"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
                <Clock size={16} weight="duotone" />
              </span>
              <span className="text-[13px] text-text-primary">
                {naFila} carga{naFila === 1 ? '' : 's'} por enviar — vai{naFila === 1 ? '' : 'ão'} quando ficares online
              </span>
            </button>
          ) : null}

          {comErro > 0 ? (
            <button
              type="button"
              onClick={() => navigate('cargas')}
              className="flex min-h-touch items-center gap-3 rounded-surface border border-error/25 bg-error/10 px-4 py-3 text-left shadow-soft"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-error/20 text-error">
                <AlertTriangle size={16} weight="duotone" />
              </span>
              <span className="text-[13px] text-text-primary">
                {comErro} carga{comErro === 1 ? '' : 's'} com falha ao enviar — toca para tentar de novo
              </span>
            </button>
          ) : null}

          {naFila === 0 && comErro === 0 ? (
            <div className="flex min-h-touch items-center justify-center gap-2 rounded-surface border border-success/20 bg-success/10 px-4 py-3 shadow-soft">
              <CheckCircle2 size={16} weight="fill" className="shrink-0 text-success" />
              <span className="text-[12px] font-medium text-success">Tudo sincronizado — as tuas cargas já estão no sistema</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
