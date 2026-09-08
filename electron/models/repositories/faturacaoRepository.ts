import { getDatabase } from '../database';
import type { PapelContacto, ResumoCliente } from '../../../src/types';

interface ResumoClienteRow {
  contacto_id: string;
  nome: string;
  telefone: string | null;
  total_cargas: number;
  valor_devido: number;
  valor_pago: number;
  tem_emissor: number;
  tem_recetor: number;
}

interface ResumoFiltros {
  contentorId?: string;
  soComDivida?: boolean;
}

// Um contacto entra na lista se for emissor OU destinatário de pelo menos
// uma carga não-arquivada — cobre os dois "donos" possíveis de uma carga
// (quem envia, quem recebe). `valorDevido`/`valorPago` continuam a refletir
// só o papel de emissor (é quem é cobrado); um contacto só-recetor aparece
// sempre com dívida 0, nunca é excluído por "soComDivida".
function resumoPorCliente(filtros: ResumoFiltros = {}): ResumoCliente[] {
  const db = getDatabase();
  const cargasClauses = [`cargas.estado != 'arquivada'`];
  const params: Record<string, unknown> = {};

  if (filtros.contentorId) {
    cargasClauses.push('cargas.contentor_id = @contentorId');
    params.contentorId = filtros.contentorId;
  }

  const whereCargas = `WHERE ${cargasClauses.join(' AND ')}`;
  const having = filtros.soComDivida ? 'HAVING valor_devido > 0' : '';

  const rows = db
    .prepare<
      Record<string, unknown>,
      ResumoClienteRow
    >(
      `WITH cargas_do_contacto AS (
         SELECT cargas.id as carga_id, cargas.estado_pagamento, cargas.valor,
                cargas.emissor_id as contacto_id, 1 as eh_emissor, 0 as eh_recetor
         FROM cargas
         ${whereCargas}

         UNION ALL

         SELECT cargas.id as carga_id, cargas.estado_pagamento, cargas.valor,
                cd.contacto_id as contacto_id, 0 as eh_emissor, 1 as eh_recetor
         FROM cargas
         JOIN carga_destinatarios cd ON cd.carga_id = cargas.id
         ${whereCargas}
       )
       SELECT contactos.id as contacto_id, contactos.nome, contactos.telefone,
         COUNT(DISTINCT cargas_do_contacto.carga_id) as total_cargas,
         SUM(CASE WHEN cargas_do_contacto.eh_emissor = 1 AND cargas_do_contacto.estado_pagamento = 'devido' THEN COALESCE(cargas_do_contacto.valor, 0) ELSE 0 END) as valor_devido,
         SUM(CASE WHEN cargas_do_contacto.eh_emissor = 1 AND cargas_do_contacto.estado_pagamento = 'pago' THEN COALESCE(cargas_do_contacto.valor, 0) ELSE 0 END) as valor_pago,
         MAX(cargas_do_contacto.eh_emissor) as tem_emissor,
         MAX(cargas_do_contacto.eh_recetor) as tem_recetor
       FROM cargas_do_contacto
       JOIN contactos ON contactos.id = cargas_do_contacto.contacto_id
       GROUP BY contactos.id
       ${having}
       ORDER BY valor_devido DESC`,
    )
    .all(params);

  return rows.map((row) => {
    const papeis: PapelContacto[] = [];
    if (row.tem_emissor) papeis.push('emissor');
    if (row.tem_recetor) papeis.push('recetor');
    return {
      contactoId: row.contacto_id,
      nome: row.nome,
      telefone: row.telefone,
      totalCargas: row.total_cargas,
      valorDevido: row.valor_devido,
      valorPago: row.valor_pago,
      papeis,
    };
  });
}

export const faturacaoRepository = { resumoPorCliente };
