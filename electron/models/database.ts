import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';

let db: Database.Database | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function runMigrations(database: Database.Database): void {
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('root', 'admin', 'user')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local'
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS contactos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      telefone TEXT,
      email TEXT,
      morada TEXT,
      nif TEXT,
      notas TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local'
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS contentores (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      codigo TEXT NOT NULL UNIQUE,
      mes_referencia TEXT NOT NULL,
      categoria TEXT,
      data_partida TEXT,
      data_chegada_prevista TEXT,
      estado TEXT NOT NULL DEFAULT 'aberto'
        CHECK (estado IN ('aberto', 'fechado', 'em_transito', 'entregue', 'bloqueado')),
      peso_total_kg REAL NOT NULL DEFAULT 0,
      m3_total REAL NOT NULL DEFAULT 0,
      valor_total REAL NOT NULL DEFAULT 0,
      custo_frete REAL,
      notas TEXT,
      oculto INTEGER NOT NULL DEFAULT 0,
      bloqueado INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local'
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS cargas (
      id TEXT PRIMARY KEY,
      codigo TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      comprimento_cm REAL,
      largura_cm REAL,
      altura_cm REAL,
      m3 REAL,
      peso_kg REAL,
      valor REAL,
      moeda TEXT NOT NULL,
      estado_pagamento TEXT NOT NULL DEFAULT 'devido' CHECK (estado_pagamento IN ('pago', 'devido')),
      tipo_embalagem TEXT,
      notas TEXT,
      estado TEXT NOT NULL DEFAULT 'recebida'
        CHECK (estado IN ('recebida', 'em_deposito', 'em_contentor', 'em_transito', 'entregue', 'arquivada')),
      contentor_id TEXT REFERENCES contentores(id),
      emissor_id TEXT NOT NULL REFERENCES contactos(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local'
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS carga_destinatarios (
      id TEXT PRIMARY KEY,
      carga_id TEXT NOT NULL REFERENCES cargas(id),
      contacto_id TEXT NOT NULL REFERENCES contactos(id),
      created_at TEXT NOT NULL
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_cargas_contentor ON cargas(contentor_id);
    CREATE INDEX IF NOT EXISTS idx_cargas_emissor ON cargas(emissor_id);
    CREATE INDEX IF NOT EXISTS idx_carga_destinatarios_carga ON carga_destinatarios(carga_id);
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS permissoes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      modulo TEXT NOT NULL,
      pode_ver INTEGER NOT NULL DEFAULT 0,
      pode_criar INTEGER NOT NULL DEFAULT 0,
      pode_editar INTEGER NOT NULL DEFAULT 0,
      pode_eliminar INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, modulo)
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS sessoes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      login_at TEXT NOT NULL,
      logout_at TEXT,
      created_at TEXT NOT NULL
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      acao TEXT NOT NULL,
      entidade TEXT,
      entidade_id TEXT,
      detalhes TEXT,
      created_at TEXT NOT NULL
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS notificacoes (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL CHECK (tipo IN ('info', 'sucesso', 'aviso', 'erro')),
      titulo TEXT NOT NULL,
      mensagem TEXT,
      lida INTEGER NOT NULL DEFAULT 0,
      link_modulo TEXT,
      link_entidade_id TEXT,
      created_at TEXT NOT NULL
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS contactos_notificados (
      id TEXT PRIMARY KEY,
      contacto_id TEXT NOT NULL REFERENCES contactos(id),
      contentor_id TEXT NOT NULL REFERENCES contentores(id),
      canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'email', 'manual')),
      contactado_em TEXT NOT NULL
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_permissoes_user ON permissoes(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessoes_user ON sessoes(user_id);
    CREATE INDEX IF NOT EXISTS idx_contactos_notificados_lookup ON contactos_notificados(contacto_id, contentor_id);
    CREATE INDEX IF NOT EXISTS idx_auditoria_user ON auditoria(user_id);
    CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);
  `);

  // Preparação para sync PWA (doc 15 §6) — colunas adicionadas via ALTER
  // TABLE porque as tabelas já existem em bases instaladas anteriormente.
  addColumnIfMissing(database, 'users', 'pwa_habilitado', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(database, 'users', 'pwa_auth_uid', 'TEXT');
  addColumnIfMissing(database, 'cargas', 'origem_pwa_user_id', 'TEXT');
}

function addColumnIfMissing(database: Database.Database, table: string, column: string, definition: string): void {
  const existing = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (existing.some((col) => col.name === column)) return;
  database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'kraga.db');
  db = new Database(dbPath);
  runMigrations(db);

  return db;
}

export function closeDatabase(): void {
  db?.close();
  db = null;
}

export { nowIso };
