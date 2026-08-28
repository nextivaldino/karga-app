import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type IpcChannel } from '../ipc/channels';

const allowed = new Set<string>(IPC_CHANNELS);
const EVENTOS_PERMITIDOS = new Set(['notificacoes:navegar', 'notificacoes:atualizada']);

contextBridge.exposeInMainWorld('kraga', {
  platform: process.platform,
  invoke: (channel: IpcChannel, ...args: unknown[]) => {
    if (!allowed.has(channel)) {
      throw new Error(`Canal IPC não autorizado: ${channel}`);
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (evento: string, callback: (...args: unknown[]) => void) => {
    if (!EVENTOS_PERMITIDOS.has(evento)) {
      throw new Error(`Evento não autorizado: ${evento}`);
    }
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(evento, listener);
    return () => ipcRenderer.removeListener(evento, listener);
  },
});
