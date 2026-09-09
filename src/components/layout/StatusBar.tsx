import { useStatusBarContext } from '@/hooks/useStatusBarText';
import { MensagensBell } from './MensagensBell';

const APP_VERSION = '0.1.0';

// Lado direito estilo bandeja do Windows 7 (relógio/rede/volume) — ícones
// de estado agrupados antes do texto fixo, cada um com a sua própria
// largura, em vez de um balão flutuante a competir pelo espaço da app.
export function StatusBar(): React.JSX.Element {
  const { text } = useStatusBarContext();
  return (
    <div className="relative flex h-7 shrink-0 items-center justify-between border-t border-border/40 bg-bg-surface/60 text-[10.5px] tracking-wide text-text-tertiary">
      <span className="px-lg">{text ?? `Karga Desktop v${APP_VERSION}`}</span>
      <div className="flex h-full items-stretch">
        <span className="flex items-center border-l border-border/40 px-lg opacity-70">Base de dados local</span>
        <MensagensBell />
      </div>
    </div>
  );
}
