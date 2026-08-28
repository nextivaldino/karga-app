import { getDatabase } from '../database';
import type { ResumoCliente } from '../../../src/types';

interface ResumoClienteRow {
  contacto_id: string;
  nome: string;
  telefone: string | null;
  total_cargas: number;
  valor_devido: number;
  valor_pago: number;
}

interface ResumoFiltros {
  contentorId?: string;
  soComDivida?: boolean;
}

function resumoPorCliente(filtros: ResumoFiltros = {}): ResumoCliente[] {
  const db = getDatabase();
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filtros.contentorId) {
    clauses.push('cargas.contentor_id = ?');
    params.push(filtros.contentorId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const having = filtros.soComDivida ? 'HAVING valor_devido > 0' : '';

  const rows = db
    .prepare<
      unknown[],
      ResumoClienteRow
    >(
      `SELECT contactos.id as contacto_id, contactos.nome, contactos.telefone,
         COUNT(cargas.id) as total_cargas,
         SUM(CASE WHEN cargas.estado_pagamento = 'devido' THEN COALESCE(cargas.valor, 0) ELSE 0 END) as valor_devido,
         SUM(CASE WHEN cargas.estado_pagamento = 'pago' THEN COALESCE(cargas.valor, 0) ELSE 0 END) as valor_pago
       FROM contactos
       JOIN cargas ON cargas.emissor_id = contactos.id
       ${where}
       GROUP BY contactos.id
       ${having}
       ORDER BY valor_devido DESC`,
    )
    .all(...params);

  return rows.map((row) => ({
    contactoId: row.contacto_id,
    nome: row.nome,
    telefone: row.telefone,
    totalCargas: row.total_cargas,
    valorDevido: row.valor_devido,
    valorPago: row.valor_pago,
  }));
}

export const faturacaoRepository = { resumoPorCliente };
