import { randomUUID } from 'node:crypto';
import { getDatabase, nowIso } from '../database';
import type { CreateEtiquetaInput, Etiqueta } from '../../../src/types';

interface EtiquetaRow {
  id: string;
  nome: string;
  cor: string;
  created_at: string;
  updated_at: string;
  sync_status: Etiqueta['syncStatus'];
}

function fromRow(row: EtiquetaRow): Etiqueta {
  return {
    id: row.id,
    nome: row.nome,
    cor: row.cor,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

function list(): Etiqueta[] {
  const db = getDatabase();
  const rows = db.prepare<[], EtiquetaRow>('SELECT * FROM etiquetas ORDER BY nome ASC').all();
  return rows.map(fromRow);
}

function findById(id: string): Etiqueta | null {
  const db = getDatabase();
  const row = db.prepare<[string], EtiquetaRow>('SELECT * FROM etiquetas WHERE id = ?').get(id);
  return row ? fromRow(row) : null;
}

function create(input: CreateEtiquetaInput): Etiqueta {
  const db = getDatabase();
  const timestamp = nowIso();
  const row: EtiquetaRow = {
    id: randomUUID(),
    nome: input.nome,
    cor: input.cor,
    created_at: timestamp,
    updated_at: timestamp,
    sync_status: 'local',
  };

  db.prepare(
    `INSERT INTO etiquetas (id, nome, cor, created_at, updated_at, sync_status)
     VALUES (@id, @nome, @cor, @created_at, @updated_at, @sync_status)`,
  ).run(row);

  return fromRow(row);
}

function update(id: string, changes: Partial<CreateEtiquetaInput>): Etiqueta | null {
  const existing = findById(id);
  if (!existing) return null;

  const db = getDatabase();
  const updated: Etiqueta = { ...existing, ...changes, updatedAt: nowIso() };

  db.prepare('UPDATE etiquetas SET nome = ?, cor = ?, updated_at = ? WHERE id = ?').run(
    updated.nome,
    updated.cor,
    updated.updatedAt,
    id,
  );

  return updated;
}

// Etiquetas são só organização (não histórico de negócio) — hard delete
// é aceitável aqui, ao contrário de contactos/cargas.
function remove(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM contacto_etiquetas WHERE etiqueta_id = ?').run(id);
  db.prepare('DELETE FROM etiquetas WHERE id = ?').run(id);
}

function attach(contactoId: string, etiquetaId: string): void {
  const db = getDatabase();
  db.prepare(
    `INSERT OR IGNORE INTO contacto_etiquetas (id, contacto_id, etiqueta_id, created_at) VALUES (?, ?, ?, ?)`,
  ).run(randomUUID(), contactoId, etiquetaId, nowIso());
}

function detach(contactoId: string, etiquetaId: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM contacto_etiquetas WHERE contacto_id = ? AND etiqueta_id = ?').run(contactoId, etiquetaId);
}

function listPorContactos(contactoIds: string[]): Record<string, Etiqueta[]> {
  if (contactoIds.length === 0) return {};
  const db = getDatabase();
  const placeholders = contactoIds.map(() => '?').join(',');
  const rows = db
    .prepare<
      unknown[],
      EtiquetaRow & { contacto_id: string }
    >(
      `SELECT etiquetas.*, contacto_etiquetas.contacto_id as contacto_id
       FROM contacto_etiquetas
       JOIN etiquetas ON etiquetas.id = contacto_etiquetas.etiqueta_id
       WHERE contacto_etiquetas.contacto_id IN (${placeholders})
       ORDER BY etiquetas.nome ASC`,
    )
    .all(...contactoIds);

  const result: Record<string, Etiqueta[]> = {};
  for (const row of rows) {
    (result[row.contacto_id] ??= []).push(fromRow(row));
  }
  return result;
}

export const etiquetaRepository = {
  list,
  findById,
  create,
  update,
  remove,
  attach,
  detach,
  listPorContactos,
};
