import { randomUUID } from 'node:crypto';
import { getDatabase, nowIso } from '../database';
import type { User, UserRole } from '../../../src/types';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  active: number;
  pwa_habilitado: number;
  pwa_auth_uid: string | null;
  created_at: string;
  updated_at: string;
  sync_status: User['syncStatus'];
}

function fromRow(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    active: row.active === 1,
    pwaHabilitado: row.pwa_habilitado === 1,
    pwaAuthUid: row.pwa_auth_uid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

function create(input: CreateUserInput): User {
  const db = getDatabase();
  const timestamp = nowIso();
  const row: UserRow = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    password_hash: input.passwordHash,
    role: input.role,
    active: 1,
    pwa_habilitado: 0,
    pwa_auth_uid: null,
    created_at: timestamp,
    updated_at: timestamp,
    sync_status: 'local',
  };

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, active, pwa_habilitado, pwa_auth_uid, created_at, updated_at, sync_status)
     VALUES (@id, @name, @email, @password_hash, @role, @active, @pwa_habilitado, @pwa_auth_uid, @created_at, @updated_at, @sync_status)`,
  ).run(row);

  return fromRow(row);
}

function findByEmail(email: string): User | null {
  const db = getDatabase();
  const row = db.prepare<[string], UserRow>('SELECT * FROM users WHERE email = ?').get(email);
  return row ? fromRow(row) : null;
}

function findById(id: string): User | null {
  const db = getDatabase();
  const row = db.prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?').get(id);
  return row ? fromRow(row) : null;
}

function list(): User[] {
  const db = getDatabase();
  const rows = db.prepare<[], UserRow>('SELECT * FROM users ORDER BY created_at ASC').all();
  return rows.map(fromRow);
}

function count(): number {
  const db = getDatabase();
  const row = db.prepare<[], { total: number }>('SELECT COUNT(*) as total FROM users').get();
  return row?.total ?? 0;
}

function update(id: string, changes: Partial<Pick<User, 'name' | 'email' | 'passwordHash' | 'active'>>): User | null {
  const db = getDatabase();
  const existing = findById(id);
  if (!existing) return null;

  const updated: User = {
    ...existing,
    ...changes,
    updatedAt: nowIso(),
  };

  db.prepare(
    `UPDATE users SET name = @name, email = @email, password_hash = @password_hash,
       active = @active, updated_at = @updated_at WHERE id = @id`,
  ).run({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    password_hash: updated.passwordHash,
    active: updated.active ? 1 : 0,
    updated_at: updated.updatedAt,
  });

  return updated;
}

function setPwaStatus(id: string, habilitado: boolean, authUid: string | null): User | null {
  const db = getDatabase();
  const existing = findById(id);
  if (!existing) return null;

  db.prepare(`UPDATE users SET pwa_habilitado = ?, pwa_auth_uid = ?, updated_at = ? WHERE id = ?`).run(
    habilitado ? 1 : 0,
    authUid,
    nowIso(),
    id,
  );

  return findById(id);
}

export const userRepository = { create, findByEmail, findById, list, count, update, setPwaStatus };
