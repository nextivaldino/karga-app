import { useEffect, useState } from 'react';
import { ipcService } from '@/services/ipcService';
import { useAuth } from '@/modules/auth/AuthContext';
import { decidirPermissao } from '@/lib/permissoes';
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
    return decidirPermissao(user.role, modulo, acao, permissoes);
  }

  return { loading, pode };
}
