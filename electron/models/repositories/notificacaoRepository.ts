import { randomUUID } from 'node:crypto';
import { getDatabase, nowIso } from '../database';
import type { Notificacao, TipoNotificacao } from '../../../src/types';

interface NotificacaoRow {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string | null;
  lida: number;
  link_modulo: string | null;
  link_entidade_id: string | null;
  created_at: string;
}

function fromRow(row: NotificacaoRow): Notificacao {
  return {
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo,
    mensagem: row.mensagem,
    lida: row.lida === 1,
    linkModulo: row.link_modulo,
    linkEntidadeId: row.link_entidade_id,
    createdAt: row.created_at,
  };
}

interface CriarNotificacaoInput {
  tipo: TipoNotificacao;
  titulo: string;
  mensagem?: string | null;
  linkModulo?: string | null;
  linkEntidadeId?: string | null;
}

function criar(input: CriarNotificacaoInput): Notificacao {
  const db = getDatabase();
  const row: NotificacaoRow = {
    id: randomUUID(),
    tipo: input.tipo,
    titulo: input.titulo,
    mensagem: input.mensagem ?? null,
    lida: 0,
    link_modulo: input.linkModulo ?? null,
    link_entidade_id: input.linkEntidadeId ?? null,
    created_at: nowIso(),
  };
  db.prepare(
    `INSERT INTO notificacoes (id, tipo, titulo, mensagem, lida, link_modulo, link_entidade_id, created_at)
     VALUES (@id, @tipo, @titulo, @mensagem, @lida, @link_modulo, @link_entidade_id, @created_at)`,
  ).run(row);
  return fromRow(row);
}

function list(limit = 30): Notificacao[] {
  const db = getDatabase();
  const rows = db
    .prepare<[number], NotificacaoRow>('SELECT * FROM notificacoes ORDER BY created_at DESC LIMIT ?')
    .all(limit);
  return rows.map(fromRow);
}

function countNaoLidas(): number {
  const db = getDatabase();
  const row = db.prepare<[], { total: number }>('SELECT COUNT(*) as total FROM notificacoes WHERE lida = 0').get();
  return row?.total ?? 0;
}

function marcarLida(id: string): void {
  const db = getDatabase();
  db.prepare('UPDATE notificacoes SET lida = 1 WHERE id = ?').run(id);
}

function marcarTodasLidas(): void {
  const db = getDatabase();
  db.prepare('UPDATE notificacoes SET lida = 1 WHERE lida = 0').run();
}

function existeSemelhanteRecente(titulo: string, linkEntidadeId: string | null, horasJanela: number): boolean {
  const db = getDatabase();
  const limite = new Date(Date.now() - horasJanela * 3_600_000).toISOString();
  const row = db
    .prepare<
      [string, string | null, string],
      { total: number }
    >(`SELECT COUNT(*) as total FROM notificacoes WHERE titulo = ? AND link_entidade_id IS ? AND created_at >= ?`)
    .get(titulo, linkEntidadeId, limite);
  return (row?.total ?? 0) > 0;
}

export const notificacaoRepository = {
  criar,
  list,
  countNaoLidas,
  marcarLida,
  marcarTodasLidas,
  existeSemelhanteRecente,
};
