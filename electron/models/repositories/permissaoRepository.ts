import { randomUUID } from 'node:crypto';
import { getDatabase, nowIso } from '../database';
import type { ModuloPermissao, Permissao, PermissaoInput, UserRole } from '../../../src/types';
import { decidirPermissao } from '../../../src/lib/permissoes';

interface PermissaoRow {
  id: string;
  user_id: string;
  modulo: ModuloPermissao;
  pode_ver: number;
  pode_criar: number;
  pode_editar: number;
  pode_eliminar: number;
}

function fromRow(row: PermissaoRow): Permissao {
  return {
    id: row.id,
    userId: row.user_id,
    modulo: row.modulo,
    podeVer: row.pode_ver === 1,
    podeCriar: row.pode_criar === 1,
    podeEditar: row.pode_editar === 1,
    podeEliminar: row.pode_eliminar === 1,
  };
}

function listPorUser(userId: string): Permissao[] {
  const db = getDatabase();
  const rows = db.prepare<[string], PermissaoRow>('SELECT * FROM permissoes WHERE user_id = ?').all(userId);
  return rows.map(fromRow);
}

function setBulk(userId: string, permissoes: PermissaoInput[]): Permissao[] {
  const db = getDatabase();
  const timestamp = nowIso();

  const run = db.transaction(() => {
    for (const p of permissoes) {
      db.prepare(
        `INSERT INTO permissoes (id, user_id, modulo, pode_ver, pode_criar, pode_editar, pode_eliminar, created_at, updated_at)
         VALUES (@id, @user_id, @modulo, @pode_ver, @pode_criar, @pode_editar, @pode_eliminar, @created_at, @updated_at)
         ON CONFLICT(user_id, modulo) DO UPDATE SET
           pode_ver = excluded.pode_ver, pode_criar = excluded.pode_criar,
           pode_editar = excluded.pode_editar, pode_eliminar = excluded.pode_eliminar,
           updated_at = excluded.updated_at`,
      ).run({
        id: randomUUID(),
        user_id: userId,
        modulo: p.modulo,
        pode_ver: p.podeVer ? 1 : 0,
        pode_criar: p.podeCriar ? 1 : 0,
        pode_editar: p.podeEditar ? 1 : 0,
        pode_eliminar: p.podeEliminar ? 1 : 0,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }
  });
  run();

  return listPorUser(userId);
}

function podeAcesso(
  userId: string,
  role: UserRole,
  modulo: ModuloPermissao,
  acao: 'ver' | 'criar' | 'editar' | 'eliminar',
): boolean {
  // Delega na mesma função pura usada pelo cliente (src/lib/permissoes) —
  // fonte única de verdade da matriz de decisão. Este é o lado que
  // realmente protege os dados (chamado por cada handler IPC); o cliente
  // só a usa para esconder/mostrar UI.
  if (role === 'admin' || role === 'root') return decidirPermissao(role, modulo, acao, []);
  return decidirPermissao(role, modulo, acao, listPorUser(userId));
}

export const permissaoRepository = { listPorUser, setBulk, podeAcesso };
