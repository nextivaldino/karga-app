import { useEffect, useState } from 'react';
import { ipcService } from '@/services/ipcService';

export interface UsuarioResumo {
  name: string;
  avatar: string | null;
}

// Mapa id de utilizador local -> {name, avatar}, para qualquer coluna
// "Origem"/"Criado por" que precise de identificar QUALQUER utilizador
// do desktop (não só os habilitados para PWA) sem repetir a mesma
// consulta a `users.list()` em cada sítio.
export function useUsuariosPorId(): Map<string, UsuarioResumo> {
  const [mapa, setMapa] = useState<Map<string, UsuarioResumo>>(new Map());

  useEffect(() => {
    void ipcService.users.list().then((usuarios) => {
      setMapa(new Map(usuarios.map((u) => [u.id, { name: u.name, avatar: u.avatar }])));
    });
  }, []);

  return mapa;
}
