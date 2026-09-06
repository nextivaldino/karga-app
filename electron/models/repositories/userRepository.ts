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
  avatar: string | null;
  login_sem_password: number;
  contentor_padrao_id: string | null;
  password_reset_solicitado_em: string | null;
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
    avatar: row.avatar,
    loginSemPassword: row.login_sem_password === 1,
    contentorPadraoId: row.contentor_padrao_id,
    passwordResetSolicitadoEm: row.password_reset_solicitado_em,
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
    avatar: null,
    login_sem_password: 0,
    contentor_padrao_id: null,
    password_reset_solicitado_em: null,
    created_at: timestamp,
    updated_at: timestamp,
    sync_status: 'local',
  };

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, active, pwa_habilitado, pwa_auth_uid, avatar, login_sem_password, created_at, updated_at, sync_status)
     VALUES (@id, @name, @email, @password_hash, @role, @active, @pwa_habilitado, @pwa_auth_uid, @avatar, @login_sem_password, @created_at, @updated_at, @sync_status)`,
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

function setAvatar(id: string, avatar: string | null): User | null {
  const db = getDatabase();
  if (!findById(id)) return null;
  db.prepare(`UPDATE users SET avatar = ?, updated_at = ? WHERE id = ?`).run(avatar, nowIso(), id);
  return findById(id);
}

function setLoginSemPassword(id: string, valor: boolean): User | null {
  const db = getDatabase();
  if (!findById(id)) return null;
  db.prepare(`UPDATE users SET login_sem_password = ?, updated_at = ? WHERE id = ?`).run(valor ? 1 : 0, nowIso(), id);
  return findById(id);
}

// Contentor padrão para envios PWA deste utilizador (null = usa o padrão
// global do sistema). Só faz sentido para utilizadores com PWA habilitado,
// mas não valida isso aqui — quem chama (userManagement) decide.
function setContentorPadrao(id: string, contentorId: string | null): User | null {
  const db = getDatabase();
  if (!findById(id)) return null;
  db.prepare(`UPDATE users SET contentor_padrao_id = ?, updated_at = ? WHERE id = ?`).run(contentorId, nowIso(), id);
  return findById(id);
}

// Pedido de reset feito pelo próprio ecrã de login (sem sessão) — Root
// vê isto em Manutenção → Utilizadores Admin e decide se reseta.
function marcarPedidoResetPassword(id: string): void {
  const db = getDatabase();
  db.prepare(`UPDATE users SET password_reset_solicitado_em = ? WHERE id = ?`).run(nowIso(), id);
}

// Limpa o pedido depois de o Root efetivamente resetar a password (ou
// se quiser dispensá-lo sem resetar).
function limparPedidoResetPassword(id: string): void {
  const db = getDatabase();
  db.prepare(`UPDATE users SET password_reset_solicitado_em = NULL WHERE id = ?`).run(id);
}

// Só o essencial (id/nome/avatar) para desenhar a grelha do ecrã de
// login, ANTES de haver sessão — nunca expor email/role/password aqui.
function listQuickLogin(): { id: string; name: string; avatar: string | null }[] {
  const db = getDatabase();
  const rows = db
    .prepare<[], { id: string; name: string; avatar: string | null }>(
      `SELECT id, name, avatar FROM users WHERE active = 1 AND login_sem_password = 1 ORDER BY name ASC`,
    )
    .all();
  return rows;
}

export const userRepository = {
  create,
  findByEmail,
  findById,
  list,
  count,
  update,
  setPwaStatus,
  setAvatar,
  setLoginSemPassword,
  setContentorPadrao,
  marcarPedidoResetPassword,
  limparPedidoResetPassword,
  listQuickLogin,
};
