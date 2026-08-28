import { randomUUID } from 'node:crypto';
import { getDatabase, nowIso } from '../database';
import type { AuditoriaEntry } from '../../../src/types';

interface AuditoriaRow {
  id: string;
  user_id: string;
  user_nome: string;
  acao: string;
  entidade: string | null;
  entidade_id: string | null;
  detalhes: string | null;
  created_at: string;
}

function fromRow(row: AuditoriaRow): AuditoriaEntry {
  return {
    id: row.id,
    userId: row.user_id,
    userNome: row.user_nome,
    acao: row.acao,
    entidade: row.entidade,
    entidadeId: row.entidade_id,
    detalhes: row.detalhes,
    createdAt: row.created_at,
  };
}

function registar(
  userId: string,
  acao: string,
  entidade: string | null = null,
  entidadeId: string | null = null,
  detalhes: string | null = null,
): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO auditoria (id, user_id, acao, entidade, entidade_id, detalhes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), userId, acao, entidade, entidadeId, detalhes, nowIso());
}

function list(limit = 100): AuditoriaEntry[] {
  const db = getDatabase();
  const rows = db
    .prepare<
      [number],
      AuditoriaRow
    >(
      `SELECT auditoria.*, users.name as user_nome
       FROM auditoria
       JOIN users ON users.id = auditoria.user_id
       ORDER BY auditoria.created_at DESC
       LIMIT ?`,
    )
    .all(limit);
  return rows.map(fromRow);
}

export const auditoriaRepository = { registar, list };
