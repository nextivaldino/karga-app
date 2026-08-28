import { randomUUID } from 'node:crypto';
import { getDatabase, nowIso } from '../database';
import type { Contacto, ContactoComContagem, CreateContactoInput } from '../../../src/types';

interface ContactoRow {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  morada: string | null;
  nif: string | null;
  notas: string | null;
  ativo: number;
  created_at: string;
  updated_at: string;
  sync_status: Contacto['syncStatus'];
}

function fromRow(row: ContactoRow): Contacto {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone,
    email: row.email,
    morada: row.morada,
    nif: row.nif,
    notas: row.notas,
    ativo: row.ativo === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

function create(input: CreateContactoInput): Contacto {
  const db = getDatabase();
  const timestamp = nowIso();
  const row: ContactoRow = {
    id: randomUUID(),
    nome: input.nome,
    telefone: input.telefone ?? null,
    email: input.email ?? null,
    morada: input.morada ?? null,
    nif: input.nif ?? null,
    notas: input.notas ?? null,
    ativo: 1,
    created_at: timestamp,
    updated_at: timestamp,
    sync_status: 'local',
  };

  db.prepare(
    `INSERT INTO contactos (id, nome, telefone, email, morada, nif, notas, ativo, created_at, updated_at, sync_status)
     VALUES (@id, @nome, @telefone, @email, @morada, @nif, @notas, @ativo, @created_at, @updated_at, @sync_status)`,
  ).run(row);

  return fromRow(row);
}

function findById(id: string): Contacto | null {
  const db = getDatabase();
  const row = db.prepare<[string], ContactoRow>('SELECT * FROM contactos WHERE id = ?').get(id);
  return row ? fromRow(row) : null;
}

function list(includeInactive = false, texto?: string): Contacto[] {
  const db = getDatabase();
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (!includeInactive) clauses.push('ativo = 1');
  if (texto?.trim()) {
    clauses.push('(nome LIKE ? OR telefone LIKE ? OR email LIKE ?)');
    params.push(`%${texto.trim()}%`, `%${texto.trim()}%`, `%${texto.trim()}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare<unknown[], ContactoRow>(`SELECT * FROM contactos ${where} ORDER BY nome ASC`).all(...params);
  return rows.map(fromRow);
}

function search(texto: string, limit = 10): Contacto[] {
  const db = getDatabase();
  const rows = db
    .prepare<
      [string, number],
      ContactoRow
    >('SELECT * FROM contactos WHERE ativo = 1 AND nome LIKE ? ORDER BY nome ASC LIMIT ?')
    .all(`%${texto}%`, limit);
  return rows.map(fromRow);
}

function listPorContentor(contentorId: string): ContactoComContagem[] {
  const db = getDatabase();
  const rows = db
    .prepare<
      [string],
      ContactoRow & { total_cargas: number; valor_devido: number }
    >(
      `SELECT contactos.*, COUNT(cargas.id) as total_cargas,
         COALESCE(SUM(CASE WHEN cargas.estado_pagamento = 'devido' THEN cargas.valor ELSE 0 END), 0) as valor_devido
       FROM contactos
       JOIN cargas ON cargas.emissor_id = contactos.id
       WHERE cargas.contentor_id = ?
       GROUP BY contactos.id
       ORDER BY contactos.nome ASC`,
    )
    .all(contentorId);
  return rows.map((row) => ({ ...fromRow(row), totalCargas: row.total_cargas, valorDevido: row.valor_devido }));
}

function update(id: string, changes: Partial<CreateContactoInput>): Contacto | null {
  const db = getDatabase();
  const existing = findById(id);
  if (!existing) return null;

  const updated: Contacto = {
    ...existing,
    ...changes,
    updatedAt: nowIso(),
  };

  db.prepare(
    `UPDATE contactos SET nome = @nome, telefone = @telefone, email = @email, morada = @morada,
       nif = @nif, notas = @notas, updated_at = @updated_at WHERE id = @id`,
  ).run({
    id: updated.id,
    nome: updated.nome,
    telefone: updated.telefone,
    email: updated.email,
    morada: updated.morada,
    nif: updated.nif,
    notas: updated.notas,
    updated_at: updated.updatedAt,
  });

  return updated;
}

function archive(id: string): Contacto | null {
  const db = getDatabase();
  const existing = findById(id);
  if (!existing) return null;

  const updatedAt = nowIso();
  db.prepare('UPDATE contactos SET ativo = 0, updated_at = ? WHERE id = ?').run(updatedAt, id);

  return { ...existing, ativo: false, updatedAt };
}

function reactivate(id: string): Contacto | null {
  const db = getDatabase();
  const existing = findById(id);
  if (!existing) return null;

  const updatedAt = nowIso();
  db.prepare('UPDATE contactos SET ativo = 1, updated_at = ? WHERE id = ?').run(updatedAt, id);

  return { ...existing, ativo: true, updatedAt };
}

export const contactoRepository = {
  create,
  findById,
  list,
  listPorContentor,
  search,
  update,
  archive,
  reactivate,
};
