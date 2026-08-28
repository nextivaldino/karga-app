import { randomUUID } from 'node:crypto';
import { getDatabase, nowIso } from '../database';
import type { CanalContacto, ContactoNotificado } from '../../../src/types';

interface ContactoNotificadoRow {
  id: string;
  contacto_id: string;
  contentor_id: string;
  canal: CanalContacto;
  contactado_em: string;
}

function fromRow(row: ContactoNotificadoRow): ContactoNotificado {
  return {
    id: row.id,
    contactoId: row.contacto_id,
    contentorId: row.contentor_id,
    canal: row.canal,
    contactadoEm: row.contactado_em,
  };
}

function registar(contactoId: string, contentorId: string, canal: CanalContacto): ContactoNotificado {
  const db = getDatabase();
  const row: ContactoNotificadoRow = {
    id: randomUUID(),
    contacto_id: contactoId,
    contentor_id: contentorId,
    canal,
    contactado_em: nowIso(),
  };
  db.prepare(
    `INSERT INTO contactos_notificados (id, contacto_id, contentor_id, canal, contactado_em)
     VALUES (@id, @contacto_id, @contentor_id, @canal, @contactado_em)`,
  ).run(row);
  return fromRow(row);
}

function listUltimosPorContentor(contentorId: string): Record<string, ContactoNotificado> {
  const db = getDatabase();
  const rows = db
    .prepare<
      [string, string],
      ContactoNotificadoRow
    >(
      `SELECT cn.* FROM contactos_notificados cn
       INNER JOIN (
         SELECT contacto_id, MAX(contactado_em) as max_em
         FROM contactos_notificados
         WHERE contentor_id = ?
         GROUP BY contacto_id
       ) latest ON latest.contacto_id = cn.contacto_id AND latest.max_em = cn.contactado_em
       WHERE cn.contentor_id = ?`,
    )
    .all(contentorId, contentorId);

  return Object.fromEntries(rows.map((row) => [row.contacto_id, fromRow(row)]));
}

export const contactoNotificadoRepository = { registar, listUltimosPorContentor };
