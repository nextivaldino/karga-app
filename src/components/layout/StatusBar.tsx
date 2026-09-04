import { useStatusBarContext } from '@/hooks/useStatusBarText';

const APP_VERSION = '0.1.0';

export function StatusBar(): React.JSX.Element {
  const { text } = useStatusBarContext();
  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-border px-lg text-[11px] text-text-tertiary">
      <span>{text ?? `Kraga Desktop v${APP_VERSION}`}</span>
      <span>Base de dados local</span>
    </div>
  );
}
