import type { IpcChannel } from '../../electron/ipc/channels';

export {};

declare global {
  interface Window {
    kraga: {
      platform: NodeJS.Platform;
      invoke: (channel: IpcChannel, ...args: unknown[]) => Promise<unknown>;
      on: (evento: 'notificacoes:navegar' | 'notificacoes:atualizada', callback: (...args: unknown[]) => void) => () => void;
    };
  }
}
