import { useEffect, useState } from 'react';
import { ipcService } from '@/services/ipcService';

// Mapa id de utilizador local -> avatar, para qualquer sítio que
// mostre "quem" (sincronização, mensagens) precisar de um avatar real
// em vez de reinventar a mesma consulta a `users.list()`.
export function useAvatarPorUsuario(): Map<string, string | null> {
  const [mapa, setMapa] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    void ipcService.users.list().then((usuarios) => {
      setMapa(new Map(usuarios.map((u) => [u.id, u.avatar])));
    });
  }, []);

  return mapa;
}
