import { randomUUID } from 'node:crypto';
import { getDatabase, nowIso } from '../database';
import type { Sessao } from '../../../src/types';

interface SessaoRow {
  id: string;
  user_id: string;
  login_at: string;
  logout_at: string | null;
}

function fromRow(row: SessaoRow): Sessao {
  return { id: row.id, userId: row.user_id, loginAt: row.login_at, logoutAt: row.logout_at };
}

function iniciar(userId: string): Sessao {
  const db = getDatabase();
  const timestamp = nowIso();
  const row: SessaoRow = { id: randomUUID(), user_id: userId, login_at: timestamp, logout_at: null };
  db.prepare(
    `INSERT INTO sessoes (id, user_id, login_at, logout_at, created_at) VALUES (@id, @user_id, @login_at, @logout_at, @created_at)`,
  ).run({ ...row, created_at: timestamp });
  return fromRow(row);
}

function terminar(sessaoId: string): void {
  const db = getDatabase();
  db.prepare('UPDATE sessoes SET logout_at = ? WHERE id = ?').run(nowIso(), sessaoId);
}

function listPorUser(userId: string): Sessao[] {
  const db = getDatabase();
  const rows = db
    .prepare<[string], SessaoRow>('SELECT * FROM sessoes WHERE user_id = ? ORDER BY login_at DESC')
    .all(userId);
  return rows.map(fromRow);
}

function ultimaSessaoPorUser(): Record<string, string> {
  const db = getDatabase();
  const rows = db
    .prepare<[], { user_id: string; login_at: string }>(
      `SELECT user_id, MAX(login_at) as login_at FROM sessoes GROUP BY user_id`,
    )
    .all();
  return Object.fromEntries(rows.map((r) => [r.user_id, r.login_at]));
}

export const sessaoRepository = { iniciar, terminar, listPorUser, ultimaSessaoPorUser };
