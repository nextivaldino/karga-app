import { ArrowsClockwise, Warning as AlertTriangle } from '@phosphor-icons/react';
import { useFilaOffline } from '@/hooks/useFilaOffline';

// Aviso de fila offline (a enviar / com erro) — vive acima da TabBar.
// Já não tinha fundo de cor cheia no antigo Dock (só ícone+texto
// coloridos sobre a superfície neutra), por isso não precisou de
// redesenho — só mudou de sítio.
export function SyncBanner(): React.JSX.Element | null {
  const { fila, aProcessar, processarFila } = useFilaOffline();
  const comErro = fila.filter((f) => f.estado === 'erro').length;
  const naFila = fila.filter((f) => f.estado === 'fila').length;

  if (aProcessar) {
    return (
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-bg-app px-4 py-2.5">
        <ArrowsClockwise size={16} className="shrink-0 animate-spin text-primary" />
        <span className="text-[12px] font-medium text-text-primary">
          A enviar {naFila} carga{naFila === 1 ? '' : 's'}...
        </span>
      </div>
    );
  }

  if (comErro > 0) {
    return (
      <button
        type="button"
        onClick={() => void processarFila()}
        className="flex shrink-0 items-center gap-2 border-b border-border bg-bg-app px-4 py-2.5 text-left active:bg-bg-input"
      >
        <AlertTriangle size={16} className="shrink-0 text-error" />
        <span className="text-[12px] font-medium text-error">
          {comErro} carga{comErro === 1 ? '' : 's'} com falha — toca para tentar de novo
        </span>
      </button>
    );
  }

  return null;
}
