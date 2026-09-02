import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface TopBarSlotContextValue {
  conteudo: ReactNode;
  definir: (node: ReactNode) => void;
}

const TopBarSlotContext = createContext<TopBarSlotContextValue | null>(null);

export function TopBarSlotProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [conteudo, setConteudo] = useState<ReactNode>(null);
  return <TopBarSlotContext.Provider value={{ conteudo, definir: setConteudo }}>{children}</TopBarSlotContext.Provider>;
}

function useSlotContext(): TopBarSlotContextValue {
  const ctx = useContext(TopBarSlotContext);
  if (!ctx) throw new Error('useTopBarSlot deve ser usado dentro de TopBarSlotProvider');
  return ctx;
}

// A página "publica" o que quer ver do lado esquerdo da barra superior
// (título + controlos próprios, ex: filtro/expandir na página Cargas).
// Corre em todos os renders (sem array de deps) para nunca ficar
// desatualizado; limpa ao desmontar para não vazar conteúdo da página
// anterior enquanto a próxima ainda não publicou o seu.
export function useTopBarSlot(node: ReactNode): void {
  const { definir } = useSlotContext();
  useEffect(() => {
    definir(node);
  });
  useEffect(() => () => definir(null), [definir]);
}

export function useTopBarSlotContent(): ReactNode {
  return useSlotContext().conteudo;
}
