import { ArrowsClockwise, Warning as AlertTriangle, House, Package, Plus } from '@phosphor-icons/react';
import { useNavigation, type MobilePage } from '@/hooks/useNavigation';
import { useNovaCargaOverlay } from '@/hooks/useNovaCargaOverlay';
import { useFilaOffline } from '@/hooks/useFilaOffline';
import { CARGA_BG, CARGA_INK } from '@/lib/cargaVisual';
import { corTextoSobre } from '@/lib/rowAccents';

const ITENS: {
  page: MobilePage;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; weight?: 'regular' | 'fill' | 'bold' | 'duotone' }>;
  cor: string;
}[] = [
  { page: 'home', label: 'Início', icon: House, cor: '#006fee' },
  { page: 'cargas', label: 'Cargas', icon: Package, cor: '#f5a524' },
];

// Ilha dinâmica estilo iOS: mesma cápsula de navegação, que cresce para
// mostrar sync/erro. Segue o tema da app (tokens HeroUI), sem inverter.
export function Dock(): React.JSX.Element {
  const { page, navigate } = useNavigation();
  const { abrir } = useNovaCargaOverlay();
  const { fila, aProcessar, processarFila } = useFilaOffline();
  const comErro = fila.filter((f) => f.estado === 'erro').length;
  const naFila = fila.filter((f) => f.estado === 'fila').length;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <div className="pointer-events-auto flex flex-col overflow-hidden rounded-[32px] border border-border bg-bg-surface/80 shadow-medium backdrop-blur-xl backdrop-saturate-150 transition-all duration-300">
        {aProcessar ? (
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
            <ArrowsClockwise size={16} className="shrink-0 animate-spin text-primary" />
            <span className="text-[12px] font-medium text-text-primary">
              A enviar {naFila} carga{naFila === 1 ? '' : 's'}...
            </span>
          </div>
        ) : comErro > 0 ? (
          <button
            type="button"
            onClick={() => void processarFila()}
            className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5 text-left active:bg-error/10"
          >
            <AlertTriangle size={16} className="shrink-0 text-error" />
            <span className="text-[12px] font-medium text-error">
              {comErro} carga{comErro === 1 ? '' : 's'} com falha — toca para tentar de novo
            </span>
          </button>
        ) : null}

        <div className="flex items-center gap-1.5 px-2.5 py-2">
          {ITENS.map((item) => (
            <DockButton key={item.page} item={item} active={page === item.page} onClick={() => navigate(item.page)} />
          ))}

          <button
            type="button"
            onClick={() => abrir()}
            title="Nova Carga"
            style={{ backgroundColor: CARGA_BG, color: CARGA_INK }}
            className="flex h-[52px] items-center gap-1.5 rounded-pill px-4 shadow-soft transition-transform active:scale-95"
          >
            <Plus size={25} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DockButton({
  item,
  active,
  onClick,
}: {
  item: (typeof ITENS)[number];
  active: boolean;
  onClick: () => void;
}): React.JSX.Element {
  const Icon = item.icon;
  const corTexto = corTextoSobre(item.cor);
  return (
    <button
      type="button"
      onClick={onClick}
      title={item.label}
      style={active ? { backgroundColor: item.cor, color: corTexto } : undefined}
      className="flex h-[52px] items-center gap-1.5 rounded-pill px-3.5 transition-all"
    >
      <Icon size={24} className={active ? '' : 'text-text-tertiary'} weight={active ? 'fill' : 'regular'} />
      {active ? <span className="text-[13px] font-semibold">{item.label}</span> : null}
    </button>
  );
}
