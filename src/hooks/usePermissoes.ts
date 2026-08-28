import { useEffect, useState } from 'react';
import { ipcService } from '@/services/ipcService';
import { useAuth } from '@/modules/auth/AuthContext';
import type { ModuloPermissao, Permissao } from '@/types';

interface PermissoesValue {
  loading: boolean;
  pode: (modulo: ModuloPermissao, acao: 'ver' | 'criar' | 'editar' | 'eliminar') => boolean;
}

export function usePermissoes(): PermissoesValue {
  const { user } = useAuth();
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'user') {
      setLoading(false);
      return;
    }
    setLoading(true);
    void ipcService.permissoes.listPorUser(user.id).then((rows) => {
      setPermissoes(rows);
      setLoading(false);
    });
  }, [user]);

  function pode(modulo: ModuloPermissao, acao: 'ver' | 'criar' | 'editar' | 'eliminar'): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'root') return false;

    const linha = permissoes.find((p) => p.modulo === modulo);
    if (!linha) return false;
    switch (acao) {
      case 'ver':
        return linha.podeVer;
      case 'criar':
        return linha.podeCriar;
      case 'editar':
        return linha.podeEditar;
      case 'eliminar':
        return linha.podeEliminar;
    }
  }

  return { loading, pode };
}
