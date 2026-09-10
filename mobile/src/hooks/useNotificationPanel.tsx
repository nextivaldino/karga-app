import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type AbaNotificacoes = 'notificacoes' | 'mensagens';

interface NotificationPanelContextValue {
  open: boolean;
  aba: AbaNotificacoes;
  abrir: (aba?: AbaNotificacoes) => void;
  fechar: () => void;
  setAba: (aba: AbaNotificacoes) => void;
}

const NotificationPanelContext = createContext<NotificationPanelContextValue | null>(null);

// Estado do painel que "nasce" da ilha dinâmica (notificações + mensagens)
// — global em vez de local ao botão da ilha, para poder ser aberto a partir
// de qualquer sítio da app (ex: o card "mensagens novas" da Home) já na aba
// certa, e não só a partir do próprio gatilho.
export function NotificationPanelProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [aba, setAba] = useState<AbaNotificacoes>('notificacoes');

  const value = useMemo<NotificationPanelContextValue>(
    () => ({
      open,
      aba,
      abrir: (novaAba) => {
        if (novaAba) setAba(novaAba);
        setOpen(true);
      },
      fechar: () => setOpen(false),
      setAba,
    }),
    [open, aba],
  );

  return <NotificationPanelContext.Provider value={value}>{children}</NotificationPanelContext.Provider>;
}

export function useNotificationPanel(): NotificationPanelContextValue {
  const ctx = useContext(NotificationPanelContext);
  if (!ctx) throw new Error('useNotificationPanel deve ser usado dentro de NotificationPanelProvider');
  return ctx;
}
