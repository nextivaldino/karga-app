import { randomUUID } from 'node:crypto';
import { getDatabase, nowIso } from '../database';
import { computeNextCode } from '../codeSequence';
import { settingsRepository } from './settingsRepository';
import { upsertContentorDisponivel } from '../../lib/supabaseClient';
import type { Contentor, CreateContentorInput } from '../../../src/types';

interface ContentorRow {
  id: string;
  nome: string;
  codigo: string;
  mes_referencia: string;
  categoria: string | null;
  data_partida: string | null;
  data_chegada_prevista: string | null;
  estado: Contentor['estado'];
  peso_total_kg: number;
  m3_total: number;
  valor_total: number;
  custo_frete: number | null;
  notas: string | null;
  oculto: number;
  bloqueado: number;
  eh_lista: number;
  padrao_global: number;
  created_at: string;
  updated_at: string;
  sync_status: Contentor['syncStatus'];
}

type ContentorRowComTotais = ContentorRow & {
  total_cargas: number;
  live_peso: number;
  live_m3: number;
  live_valor: number;
  ultima_carga_at: string | null;
};

const SELECT_COM_TOTAIS = `
  SELECT contentores.*,
    (SELECT COUNT(*) FROM cargas WHERE cargas.contentor_id = contentores.id) as total_cargas,
    (SELECT COALESCE(SUM(peso_kg), 0) FROM cargas WHERE cargas.contentor_id = contentores.id) as live_peso,
    (SELECT COALESCE(SUM(m3), 0) FROM cargas WHERE cargas.contentor_id = contentores.id) as live_m3,
    (SELECT COALESCE(SUM(valor), 0) FROM cargas WHERE cargas.contentor_id = contentores.id) as live_valor,
    (SELECT MAX(created_at) FROM cargas WHERE cargas.contentor_id = contentores.id) as ultima_carga_at
  FROM contentores
`;

const DIAS_PARADO_DEFAULT = 14;

function diasParadoLimite(): number {
  const valor = settingsRepository.get('dias_contentor_parado');
  const parsed = valor ? Number(valor) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DIAS_PARADO_DEFAULT;
}

const MS_POR_DIA = 86_400_000;

function calcularDiasParado(row: ContentorRowComTotais, limite: number): number | null {
  if (row.estado !== 'aberto') return null;
  const referencia = row.ultima_carga_at ?? row.created_at;
  const dias = Math.floor((Date.now() - new Date(referencia).getTime()) / MS_POR_DIA);
  return dias > limite ? dias : null;
}

function calcularPartindoEmBreve(row: ContentorRowComTotais): boolean {
  if (!row.data_partida) return false;
  const diasParaPartida = Math.ceil((new Date(row.data_partida).getTime() - Date.now()) / MS_POR_DIA);
  return diasParaPartida >= 0 && diasParaPartida <= 2;
}

function calcularChegadaEmBreve(row: ContentorRowComTotais): boolean {
  if (row.estado !== 'em_transito' || !row.data_chegada_prevista) return false;
  const diasParaChegada = Math.ceil((new Date(row.data_chegada_prevista).getTime() - Date.now()) / MS_POR_DIA);
  return diasParaChegada >= 0 && diasParaChegada <= 2;
}

function calcularAtrasado(row: ContentorRowComTotais): boolean {
  if (row.estado !== 'em_transito' || !row.data_chegada_prevista) return false;
  return new Date(row.data_chegada_prevista).getTime() < Date.now();
}

const ORDER_POR_ESTADO = `
  ORDER BY
    CASE contentores.estado
      WHEN 'aberto' THEN 1
      WHEN 'em_transito' THEN 2
      WHEN 'fechado' THEN 3
      WHEN 'entregue' THEN 4
      ELSE 5
    END,
    contentores.created_at DESC
`;

function fromRow(row: ContentorRowComTotais, limite: number): Contentor {
  return {
    id: row.id,
    nome: row.nome,
    codigo: row.codigo,
    mesReferencia: row.mes_referencia,
    categoria: row.categoria,
    dataPartida: row.data_partida,
    dataChegadaPrevista: row.data_chegada_prevista,
    estado: row.estado,
    pesoTotalKg: row.live_peso,
    m3Total: row.live_m3,
    valorTotal: row.live_valor,
    totalCargas: row.total_cargas,
    custoFrete: row.custo_frete,
    notas: row.notas,
    oculto: row.oculto === 1,
    bloqueado: row.bloqueado === 1,
    ehLista: row.eh_lista === 1,
    padraoGlobal: row.padrao_global === 1,
    diasParado: calcularDiasParado(row, limite),
    partindoEmBreve: calcularPartindoEmBreve(row),
    chegadaEmBreve: calcularChegadaEmBreve(row),
    atrasado: calcularAtrasado(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

// doc 16 §2 — sempre que estado/nome/codigo mudam, empurra (fire-and-forget)
// o espelho read-only para o PWA consultar contentores abertos.
function syncDisponivel(contentor: Contentor): void {
  upsertContentorDisponivel({
    id: contentor.id,
    nome: contentor.nome,
    codigo: contentor.codigo,
    estado: contentor.estado,
    padraoGlobal: contentor.padraoGlobal,
  });
}

function codigoExiste(codigo: string, excludeId?: string): boolean {
  const db = getDatabase();
  const row = excludeId
    ? db
        .prepare<[string, string], { total: number }>('SELECT COUNT(*) as total FROM contentores WHERE codigo = ? AND id != ?')
        .get(codigo, excludeId)
    : db.prepare<[string], { total: number }>('SELECT COUNT(*) as total FROM contentores WHERE codigo = ?').get(codigo);
  return (row?.total ?? 0) > 0;
}

function mesReferenciaAtual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function create(input: CreateContentorInput): Contentor {
  if (codigoExiste(input.codigo)) {
    throw new Error(`Já existe um contentor com o código "${input.codigo}".`);
  }

  const db = getDatabase();
  const timestamp = nowIso();
  const row: ContentorRow = {
    id: randomUUID(),
    nome: input.nome,
    codigo: input.codigo,
    mes_referencia: input.mesReferencia ?? mesReferenciaAtual(),
    categoria: input.categoria ?? null,
    data_partida: input.dataPartida ?? null,
    data_chegada_prevista: input.dataChegadaPrevista ?? null,
    estado: 'aberto',
    peso_total_kg: 0,
    m3_total: 0,
    valor_total: 0,
    custo_frete: null,
    notas: null,
    oculto: 0,
    bloqueado: 0,
    eh_lista: input.ehLista ? 1 : 0,
    padrao_global: 0,
    created_at: timestamp,
    updated_at: timestamp,
    sync_status: 'local',
  };

  db.prepare(
    `INSERT INTO contentores (id, nome, codigo, mes_referencia, categoria, data_partida, data_chegada_prevista,
       estado, peso_total_kg, m3_total, valor_total, custo_frete, notas, oculto, bloqueado, eh_lista, created_at, updated_at, sync_status)
     VALUES (@id, @nome, @codigo, @mes_referencia, @categoria, @data_partida, @data_chegada_prevista,
       @estado, @peso_total_kg, @m3_total, @valor_total, @custo_frete, @notas, @oculto, @bloqueado, @eh_lista, @created_at, @updated_at, @sync_status)`,
  ).run(row);

  const contentor = fromRow(
    { ...row, total_cargas: 0, live_peso: 0, live_m3: 0, live_valor: 0, ultima_carga_at: null },
    diasParadoLimite(),
  );
  syncDisponivel(contentor);
  return contentor;
}

function findById(id: string): Contentor | null {
  const db = getDatabase();
  const row = db
    .prepare<[string], ContentorRowComTotais>(`${SELECT_COM_TOTAIS} WHERE contentores.id = ?`)
    .get(id);
  return row ? fromRow(row, diasParadoLimite()) : null;
}

interface ListFilters {
  estado?: Contentor['estado'];
  mesReferencia?: string;
  incluirOcultos?: boolean;
}

function list(filters: ListFilters = {}): Contentor[] {
  const db = getDatabase();
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (!filters.incluirOcultos) clauses.push('contentores.oculto = 0');
  if (filters.estado) {
    clauses.push('contentores.estado = ?');
    params.push(filters.estado);
  }
  if (filters.mesReferencia) {
    clauses.push('contentores.mes_referencia = ?');
    params.push(filters.mesReferencia);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare<unknown[], ContentorRowComTotais>(`${SELECT_COM_TOTAIS} ${where} ${ORDER_POR_ESTADO}`)
    .all(...params);
  const limite = diasParadoLimite();
  return rows.map((row) => fromRow(row, limite));
}

function update(id: string, changes: Partial<CreateContentorInput>): Contentor | null {
  const existing = findById(id);
  if (!existing) return null;

  if (changes.codigo && changes.codigo !== existing.codigo && codigoExiste(changes.codigo, id)) {
    throw new Error(`Já existe um contentor com o código "${changes.codigo}".`);
  }

  const db = getDatabase();
  const merged: Contentor = { ...existing, ...changes, updatedAt: nowIso() };

  db.prepare(
    `UPDATE contentores SET nome = @nome, codigo = @codigo, mes_referencia = @mes_referencia, categoria = @categoria,
       data_partida = @data_partida, data_chegada_prevista = @data_chegada_prevista, updated_at = @updated_at
       WHERE id = @id`,
  ).run({
    id: merged.id,
    nome: merged.nome,
    codigo: merged.codigo,
    mes_referencia: merged.mesReferencia,
    categoria: merged.categoria,
    data_partida: merged.dataPartida,
    data_chegada_prevista: merged.dataChegadaPrevista,
    updated_at: merged.updatedAt,
  });

  const updated = findById(id);
  if (updated) syncDisponivel(updated);
  return updated;
}

// Ação explícita e irreversível (não faz parte do `update()` genérico,
// tal como `eh_lista` também não é aceite lá) — a única forma de uma
// Lista deixar de o ser.
function converterEmContentor(id: string): Contentor | null {
  const db = getDatabase();
  const existing = findById(id);
  if (!existing) return null;

  db.prepare(`UPDATE contentores SET eh_lista = 0, updated_at = ? WHERE id = ?`).run(nowIso(), id);
  return findById(id);
}

function nextCodigo(): string {
  const db = getDatabase();
  const prefix = settingsRepository.get('prefixo_codigo_contentor') ?? 'CONT';
  const rows = db.prepare<[], { codigo: string }>('SELECT codigo FROM contentores').all();
  return computeNextCode(prefix, rows.map((r) => r.codigo));
}

function search(texto: string, limit = 8): Contentor[] {
  const db = getDatabase();
  const rows = db
    .prepare<
      [string, string, number],
      ContentorRowComTotais
    >(`${SELECT_COM_TOTAIS} WHERE contentores.nome LIKE ? OR contentores.codigo LIKE ? ${ORDER_POR_ESTADO} LIMIT ?`)
    .all(`%${texto}%`, `%${texto}%`, limit);
  const limite = diasParadoLimite();
  return rows.map((row) => fromRow(row, limite));
}

// Só para a pesquisa global do cabeçalho — além do próprio nome/código,
// também traz o contentor quando é uma carga lá dentro (ou o emissor
// dela) que corresponde à pesquisa, ex: procurar "Sofá" ou o nome de um
// cliente também mostra em que contentor a carga dele está.
function searchGlobal(texto: string, limit = 8): Contentor[] {
  const db = getDatabase();
  const padrao = `%${texto}%`;
  const rows = db
    .prepare<
      [string, string, string, string, string, number],
      ContentorRowComTotais
    >(
      `${SELECT_COM_TOTAIS}
       WHERE contentores.nome LIKE ? OR contentores.codigo LIKE ?
         OR EXISTS (
           SELECT 1 FROM cargas
           JOIN contactos ON contactos.id = cargas.emissor_id
           WHERE cargas.contentor_id = contentores.id
             AND cargas.estado != 'arquivada'
             AND (cargas.nome LIKE ? OR cargas.codigo LIKE ? OR contactos.nome LIKE ?)
         )
       ${ORDER_POR_ESTADO} LIMIT ?`,
    )
    .all(padrao, padrao, padrao, padrao, padrao, limit);
  const limite = diasParadoLimite();
  return rows.map((row) => fromRow(row, limite));
}

function countAbertos(): number {
  const db = getDatabase();
  const row = db
    .prepare<[], { total: number }>(`SELECT COUNT(*) as total FROM contentores WHERE estado = 'aberto'`)
    .get();
  return row?.total ?? 0;
}

function setFlag(id: string, coluna: 'bloqueado' | 'oculto', valor: boolean): Contentor | null {
  const db = getDatabase();
  const existing = findById(id);
  if (!existing) return null;

  db.prepare(`UPDATE contentores SET ${coluna} = ?, updated_at = ? WHERE id = ?`).run(valor ? 1 : 0, nowIso(), id);
  return findById(id);
}

function bloquear(id: string): Contentor | null {
  return setFlag(id, 'bloqueado', true);
}

function desbloquear(id: string): Contentor | null {
  return setFlag(id, 'bloqueado', false);
}

function ocultar(id: string): Contentor | null {
  return setFlag(id, 'oculto', true);
}

function mostrar(id: string): Contentor | null {
  return setFlag(id, 'oculto', false);
}

// Mutuamente exclusivo (ao contrário de setFlag/bloquear/ocultar) — só um
// contentor pode ser o padrão global de cada vez. Sincroniza só os dois
// contentores cujo padrao_global realmente mudou (o antigo e o novo), não
// a tabela toda, já que os restantes já estavam a false na Supabase.
function definirPadraoGlobal(id: string): Contentor | null {
  const novo = findById(id);
  if (!novo) return null;

  const db = getDatabase();
  const antigoRow = db
    .prepare<[], { id: string }>(`SELECT id FROM contentores WHERE padrao_global = 1`)
    .get();

  const transacao = db.transaction(() => {
    db.prepare(`UPDATE contentores SET padrao_global = 0 WHERE padrao_global = 1`).run();
    db.prepare(`UPDATE contentores SET padrao_global = 1, updated_at = ? WHERE id = ?`).run(nowIso(), id);
  });
  transacao();

  if (antigoRow && antigoRow.id !== id) {
    const antigo = findById(antigoRow.id);
    if (antigo) syncDisponivel(antigo);
  }
  const atualizado = findById(id)!;
  syncDisponivel(atualizado);
  return atualizado;
}

function eliminar(id: string): void {
  const contentor = findById(id);
  if (!contentor) return;
  if (contentor.estado !== 'aberto' || contentor.totalCargas > 0) {
    throw new Error('Só é possível eliminar contentores abertos e sem cargas associadas. Use "Ocultar" em alternativa.');
  }
  const db = getDatabase();
  db.prepare('DELETE FROM contentores WHERE id = ?').run(id);
}

function fechar(id: string): Contentor {
  const contentor = findById(id);
  if (!contentor) throw new Error('Contentor não encontrado.');
  if (contentor.estado !== 'aberto') {
    throw new Error('Só é possível fechar um contentor que esteja aberto.');
  }
  if (contentor.bloqueado) {
    throw new Error('Desbloqueie o contentor antes de o fechar.');
  }

  const db = getDatabase();
  const timestamp = nowIso();

  db.prepare(
    `UPDATE contentores SET estado = 'fechado', peso_total_kg = ?, m3_total = ?, valor_total = ?, updated_at = ? WHERE id = ?`,
  ).run(contentor.pesoTotalKg, contentor.m3Total, contentor.valorTotal, timestamp, id);

  db.prepare(
    `UPDATE cargas SET estado = 'em_contentor', updated_at = ? WHERE contentor_id = ? AND estado IN ('recebida', 'em_deposito')`,
  ).run(timestamp, id);

  const fechado = findById(id)!;
  syncDisponivel(fechado);
  return fechado;
}

function marcarEmTransito(id: string): Contentor {
  const contentor = findById(id);
  if (!contentor) throw new Error('Contentor não encontrado.');
  if (contentor.estado !== 'fechado') {
    throw new Error('Só é possível marcar como Em Trânsito um contentor fechado.');
  }
  if (contentor.bloqueado) {
    throw new Error('Desbloqueie o contentor antes de mudar o estado.');
  }

  const db = getDatabase();
  const timestamp = nowIso();

  db.prepare(`UPDATE contentores SET estado = 'em_transito', updated_at = ? WHERE id = ?`).run(timestamp, id);
  db.prepare(`UPDATE cargas SET estado = 'em_transito', updated_at = ? WHERE contentor_id = ? AND estado = 'em_contentor'`).run(
    timestamp,
    id,
  );

  const emTransito = findById(id)!;
  syncDisponivel(emTransito);
  return emTransito;
}

function marcarEntregue(id: string): Contentor {
  const contentor = findById(id);
  if (!contentor) throw new Error('Contentor não encontrado.');
  if (contentor.estado !== 'em_transito') {
    throw new Error('Só é possível marcar como Entregue um contentor em trânsito.');
  }

  const db = getDatabase();
  const timestamp = nowIso();

  db.prepare(`UPDATE contentores SET estado = 'entregue', updated_at = ? WHERE id = ?`).run(timestamp, id);
  db.prepare(`UPDATE cargas SET estado = 'entregue', updated_at = ? WHERE contentor_id = ? AND estado = 'em_transito'`).run(
    timestamp,
    id,
  );

  const entregue = findById(id)!;
  syncDisponivel(entregue);
  return entregue;
}

export const contentorRepository = {
  create,
  findById,
  list,
  update,
  converterEmContentor,
  nextCodigo,
  search,
  searchGlobal,
  countAbertos,
  bloquear,
  desbloquear,
  ocultar,
  mostrar,
  definirPadraoGlobal,
  eliminar,
  fechar,
  marcarEmTransito,
  marcarEntregue,
};
