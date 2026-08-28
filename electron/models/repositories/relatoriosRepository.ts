import { getDatabase } from '../database';
import type {
  Agrupamento,
  EstadoCarga,
  EstadoContentor,
  PeriodoFiltro,
  RelatorioCargaPendenteLinha,
  RelatorioCargasPorClienteLinha,
  RelatorioCargasPorContentorLinha,
  RelatorioCargasPorPeriodoLinha,
  RelatorioResumoFinanceiroLinha,
} from '../../../src/types';

function whereDatas(campo: string, filtro: PeriodoFiltro, params: unknown[]): string {
  const clauses: string[] = [];
  if (filtro.dataInicio) {
    clauses.push(`date(${campo}) >= date(?)`);
    params.push(filtro.dataInicio);
  }
  if (filtro.dataFim) {
    clauses.push(`date(${campo}) <= date(?)`);
    params.push(filtro.dataFim);
  }
  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
}

const BUCKET_EXPR: Record<Agrupamento, string> = {
  dia: "strftime('%Y-%m-%d', created_at)",
  semana: "strftime('%Y-S%W', created_at)",
  mes: "strftime('%Y-%m', created_at)",
};

interface CargasPorPeriodoFiltro extends PeriodoFiltro {
  agrupamento?: Agrupamento;
}

function cargasPorPeriodo(filtro: CargasPorPeriodoFiltro = {}): RelatorioCargasPorPeriodoLinha[] {
  const db = getDatabase();
  const bucket = BUCKET_EXPR[filtro.agrupamento ?? 'mes'];
  const params: unknown[] = [];
  const where = whereDatas('created_at', filtro, params);

  return db
    .prepare<unknown[], RelatorioCargasPorPeriodoLinha>(
      `SELECT ${bucket} as periodo,
         COUNT(*) as totalCargas,
         COALESCE(SUM(peso_kg), 0) as pesoTotal,
         COALESCE(SUM(m3), 0) as m3Total,
         COALESCE(SUM(valor), 0) as valorTotal,
         COALESCE(SUM(CASE WHEN estado_pagamento = 'pago' THEN valor ELSE 0 END), 0) as valorPago,
         COALESCE(SUM(CASE WHEN estado_pagamento = 'devido' THEN valor ELSE 0 END), 0) as valorDevido
       FROM cargas
       ${where}
       GROUP BY periodo
       ORDER BY periodo ASC`,
    )
    .all(...params);
}

interface ContentorRelatorioRow {
  codigo: string;
  nome: string;
  estado: EstadoContentor;
  totalCargas: number;
  pesoTotal: number;
  m3Total: number;
  valorTotal: number;
}

function cargasPorContentor(filtro: PeriodoFiltro = {}): RelatorioCargasPorContentorLinha[] {
  const db = getDatabase();
  const params: unknown[] = [];
  const where = whereDatas('contentores.created_at', filtro, params);

  return db
    .prepare<unknown[], ContentorRelatorioRow>(
      `SELECT contentores.codigo, contentores.nome, contentores.estado,
         (SELECT COUNT(*) FROM cargas WHERE cargas.contentor_id = contentores.id) as totalCargas,
         (SELECT COALESCE(SUM(peso_kg), 0) FROM cargas WHERE cargas.contentor_id = contentores.id) as pesoTotal,
         (SELECT COALESCE(SUM(m3), 0) FROM cargas WHERE cargas.contentor_id = contentores.id) as m3Total,
         (SELECT COALESCE(SUM(valor), 0) FROM cargas WHERE cargas.contentor_id = contentores.id) as valorTotal
       FROM contentores
       ${where}
       ORDER BY contentores.created_at DESC`,
    )
    .all(...params);
}

function cargasPorCliente(filtro: PeriodoFiltro = {}): RelatorioCargasPorClienteLinha[] {
  const db = getDatabase();
  const params: unknown[] = [];
  const where = whereDatas('cargas.created_at', filtro, params);

  return db
    .prepare<unknown[], RelatorioCargasPorClienteLinha>(
      `SELECT contactos.nome, contactos.telefone,
         COUNT(cargas.id) as totalCargas,
         COALESCE(SUM(cargas.valor), 0) as valorTotal
       FROM contactos
       JOIN cargas ON cargas.emissor_id = contactos.id
       ${where}
       GROUP BY contactos.id
       ORDER BY valorTotal DESC`,
    )
    .all(...params);
}

interface CargaPendenteRow {
  codigo: string;
  nome: string;
  emissorNome: string;
  contentorCodigo: string | null;
  estado: EstadoCarga;
  createdAt: string;
}

function cargasPendentes(): RelatorioCargaPendenteLinha[] {
  const db = getDatabase();
  return db
    .prepare<[], CargaPendenteRow>(
      `SELECT cargas.codigo, cargas.nome, contactos.nome as emissorNome,
         contentores.codigo as contentorCodigo, cargas.estado, cargas.created_at as createdAt
       FROM cargas
       JOIN contactos ON contactos.id = cargas.emissor_id
       LEFT JOIN contentores ON contentores.id = cargas.contentor_id
       WHERE cargas.estado NOT IN ('entregue', 'arquivada')
       ORDER BY cargas.created_at ASC`,
    )
    .all();
}

function resumoFinanceiro(filtro: PeriodoFiltro = {}): RelatorioResumoFinanceiroLinha[] {
  const db = getDatabase();
  const params: unknown[] = [];
  const where = whereDatas('created_at', filtro, params);

  return db
    .prepare<unknown[], RelatorioResumoFinanceiroLinha>(
      `SELECT strftime('%Y-%m', created_at) as periodo,
         COALESCE(SUM(valor), 0) as valorTotal,
         COALESCE(SUM(CASE WHEN estado_pagamento = 'pago' THEN valor ELSE 0 END), 0) as valorPago,
         COALESCE(SUM(CASE WHEN estado_pagamento = 'devido' THEN valor ELSE 0 END), 0) as valorDevido
       FROM cargas
       ${where}
       GROUP BY periodo
       ORDER BY periodo ASC`,
    )
    .all(...params);
}

export const relatoriosRepository = {
  cargasPorPeriodo,
  cargasPorContentor,
  cargasPorCliente,
  cargasPendentes,
  resumoFinanceiro,
};
