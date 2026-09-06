import { useStatusBarContext } from '@/hooks/useStatusBarText';

const APP_VERSION = '0.1.0';

export function StatusBar(): React.JSX.Element {
  const { text } = useStatusBarContext();
  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-border/40 bg-bg-surface/60 px-lg text-[10.5px] tracking-wide text-text-tertiary">
      <span>{text ?? `Karga Desktop v${APP_VERSION}`}</span>
      <span className="opacity-70">Base de dados local</span>
    </div>
  );
}
