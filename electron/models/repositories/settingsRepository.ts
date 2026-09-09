import { getDatabase, nowIso } from '../database';

interface SettingRow {
  chave: string;
  valor: string;
  updated_at: string;
}

function get(chave: string): string | null {
  const db = getDatabase();
  const row = db.prepare<[string], SettingRow>('SELECT * FROM settings WHERE chave = ?').get(chave);
  return row?.valor ?? null;
}

function getAll(): Record<string, string> {
  const db = getDatabase();
  const rows = db.prepare<[], SettingRow>('SELECT * FROM settings').all();
  return Object.fromEntries(rows.map((row) => [row.chave, row.valor]));
}

function set(chave: string, valor: string): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO settings (chave, valor, updated_at) VALUES (@chave, @valor, @updated_at)
     ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at`,
  ).run({ chave, valor, updated_at: nowIso() });
}

function remove(chave: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM settings WHERE chave = ?').run(chave);
}

export const settingsRepository = { get, getAll, set, remove };
