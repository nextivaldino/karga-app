import type { ModuloPermissao, Permissao, UserRole } from '../types';

// Única fonte de verdade da regra de autorização granular, partilhada
// entre o servidor (electron/models/repositories/permissaoRepository.ts,
// que aplica isto a cada handler IPC — é o que realmente protege os
// dados) e o cliente (usePermissoes, só para esconder/mostrar UI). Antes
// desta extração, a mesma matriz de decisão vivia duplicada em TS nos
// dois lados, sem garantia de se manterem sincronizados.
export function decidirPermissao(
  role: UserRole,
  modulo: ModuloPermissao,
  acao: 'ver' | 'criar' | 'editar' | 'eliminar',
  permissoes: Permissao[],
): boolean {
  if (role === 'admin') return true;
  if (role === 'root') return false;

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
