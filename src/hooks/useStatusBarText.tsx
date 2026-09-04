import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface StatusBarContextValue {
  text: string | null;
  setText: (text: string | null) => void;
}

const StatusBarContext = createContext<StatusBarContextValue | null>(null);

export function StatusBarProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [text, setText] = useState<string | null>(null);
  return <StatusBarContext.Provider value={{ text, setText }}>{children}</StatusBarContext.Provider>;
}

export function useStatusBarContext(): StatusBarContextValue {
  const ctx = useContext(StatusBarContext);
  if (!ctx) throw new Error('useStatusBarContext deve ser usado dentro de StatusBarProvider');
  return ctx;
}

// Cada página chama isto para publicar um resumo contextual na barra de
// estado do fundo (estilo Finder: "12 items, 340 KB disponíveis") — some
// automaticamente ao desmontar/mudar de página.
export function useStatusBarText(text: string | null): void {
  const { setText } = useStatusBarContext();
  useEffect(() => {
    setText(text);
    return () => setText(null);
  }, [text, setText]);
}
