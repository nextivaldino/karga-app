import { randomUUID } from 'node:crypto';
import { getDatabase, nowIso } from '../database';
import { computeNextCode } from '../codeSequence';
import { settingsRepository } from './settingsRepository';
import { contentorRepository } from './contentorRepository';
import type { Carga, CargaComEmissor, CreateCargaBatchItem, CreateCargaInput } from '../../../src/types';

interface CargaRow {
  id: string;
  codigo: string;
  nome: string;
  comprimento_cm: number | null;
  largura_cm: number | null;
  altura_cm: number | null;
  m3: number | null;
  peso_kg: number | null;
  valor: number | null;
  moeda: string;
  estado_pagamento: Carga['estadoPagamento'];
  tipo_embalagem: string | null;
  notas: string | null;
  estado: Carga['estado'];
  contentor_id: string | null;
  emissor_id: string;
  origem_pwa_user_id: string | null;
  created_at: string;
  updated_at: string;
  sync_status: Carga['syncStatus'];
}

function fromRow(row: CargaRow): Carga {
  return {
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    comprimentoCm: row.comprimento_cm,
    larguraCm: row.largura_cm,
    alturaCm: row.altura_cm,
    m3: row.m3,
    pesoKg: row.peso_kg,
    valor: row.valor,
    moeda: row.moeda,
    estadoPagamento: row.estado_pagamento,
    tipoEmbalagem: row.tipo_embalagem,
    notas: row.notas,
    estado: row.estado,
    contentorId: row.contentor_id,
    emissorId: row.emissor_id,
    origemPwaUserId: row.origem_pwa_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

function calcularM3(comprimentoCm: number | null, larguraCm: number | null, alturaCm: number | null): number | null {
  if (comprimentoCm == null || larguraCm == null || alturaCm == null) return null;
  return (comprimentoCm * larguraCm * alturaCm) / 1_000_000;
}

function codigoExiste(codigo: string, excludeId?: string): boolean {
  const db = getDatabase();
  const row = excludeId
    ? db.prepare<[string, string], { total: number }>('SELECT COUNT(*) as total FROM cargas WHERE codigo = ? AND id != ?').get(codigo, excludeId)
    : db.prepare<[string], { total: number }>('SELECT COUNT(*) as total FROM cargas WHERE codigo = ?').get(codigo);
  return (row?.total ?? 0) > 0;
}

function create(input: CreateCargaInput): Carga {
  if (codigoExiste(input.codigo)) {
    throw new Error(`Já existe uma carga com o código "${input.codigo}".`);
  }

  const db = getDatabase();
  const timestamp = nowIso();
  const comprimentoCm = input.comprimentoCm ?? null;
  const larguraCm = input.larguraCm ?? null;
  const alturaCm = input.alturaCm ?? null;

  const row: CargaRow = {
    id: randomUUID(),
    codigo: input.codigo,
    nome: input.nome,
    comprimento_cm: comprimentoCm,
    largura_cm: larguraCm,
    altura_cm: alturaCm,
    m3: calcularM3(comprimentoCm, larguraCm, alturaCm),
    peso_kg: input.pesoKg ?? null,
    valor: input.valor ?? null,
    moeda: input.moeda ?? settingsRepository.get('moeda_origem') ?? 'EUR',
    estado_pagamento: input.estadoPagamento ?? 'devido',
    tipo_embalagem: input.tipoEmbalagem ?? null,
    notas: input.notas ?? null,
    estado: 'recebida',
    contentor_id: input.contentorId ?? null,
    emissor_id: input.emissorId,
    origem_pwa_user_id: input.origemPwaUserId ?? null,
    created_at: timestamp,
    updated_at: timestamp,
    sync_status: 'local',
  };

  db.prepare(
    `INSERT INTO cargas (id, codigo, nome, comprimento_cm, largura_cm, altura_cm, m3, peso_kg, valor, moeda,
       estado_pagamento, tipo_embalagem, notas, estado, contentor_id, emissor_id, origem_pwa_user_id, created_at, updated_at, sync_status)
     VALUES (@id, @codigo, @nome, @comprimento_cm, @largura_cm, @altura_cm, @m3, @peso_kg, @valor, @moeda,
       @estado_pagamento, @tipo_embalagem, @notas, @estado, @contentor_id, @emissor_id, @origem_pwa_user_id, @created_at, @updated_at, @sync_status)`,
  ).run(row);

  return fromRow(row);
}

function findById(id: string): Carga | null {
  const db = getDatabase();
  const row = db.prepare<[string], CargaRow>('SELECT * FROM cargas WHERE id = ?').get(id);
  return row ? fromRow(row) : null;
}

interface ListFilters {
  id?: string;
  contentorId?: string | null;
  emissorId?: string;
  texto?: string;
  estadoPagamento?: Carga['estadoPagamento'];
  origemPwaUserId?: string;
}

function list(filters: ListFilters = {}): CargaComEmissor[] {
  const db = getDatabase();
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.id) {
    clauses.push('cargas.id = ?');
    params.push(filters.id);
  }
  if (filters.contentorId !== undefined) {
    if (filters.contentorId === null) {
      clauses.push('cargas.contentor_id IS NULL');
    } else {
      clauses.push('cargas.contentor_id = ?');
      params.push(filters.contentorId);
    }
  }
  if (filters.texto) {
    clauses.push('(cargas.nome LIKE ? OR cargas.codigo LIKE ? OR contactos.nome LIKE ?)');
    params.push(`%${filters.texto}%`, `%${filters.texto}%`, `%${filters.texto}%`);
  }
  if (filters.estadoPagamento) {
    clauses.push('cargas.estado_pagamento = ?');
    params.push(filters.estadoPagamento);
  }
  if (filters.emissorId) {
    clauses.push('cargas.emissor_id = ?');
    params.push(filters.emissorId);
  }
  if (filters.origemPwaUserId) {
    clauses.push('cargas.origem_pwa_user_id = ?');
    params.push(filters.origemPwaUserId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare<
      unknown[],
      CargaRow & { emissor_nome: string }
    >(
      `SELECT cargas.*, contactos.nome as emissor_nome FROM cargas
       JOIN contactos ON contactos.id = cargas.emissor_id
       ${where} ORDER BY cargas.created_at DESC`,
    )
    .all(...params);
  return rows.map((row) => ({ ...fromRow(row), emissorNome: row.emissor_nome }));
}

function update(id: string, changes: Partial<CreateCargaInput>): Carga | null {
  const existing = findById(id);
  if (!existing) return null;

  if (changes.codigo && changes.codigo !== existing.codigo && codigoExiste(changes.codigo, id)) {
    throw new Error(`Já existe uma carga com o código "${changes.codigo}".`);
  }

  if (changes.contentorId !== undefined && changes.contentorId !== existing.contentorId) {
    if (existing.contentorId) {
      const origem = contentorRepository.findById(existing.contentorId);
      if (origem && origem.estado !== 'aberto') {
        throw new Error('Não é possível remover esta carga: o contentor de origem já não está aberto.');
      }
    }
    if (changes.contentorId) {
      const destino = contentorRepository.findById(changes.contentorId);
      if (!destino) throw new Error('Contentor de destino não encontrado.');
      if (destino.estado !== 'aberto') {
        throw new Error('Não é possível associar esta carga: o contentor de destino não está aberto.');
      }
    }
  }

  const db = getDatabase();
  const comprimentoCm = changes.comprimentoCm !== undefined ? changes.comprimentoCm : existing.comprimentoCm;
  const larguraCm = changes.larguraCm !== undefined ? changes.larguraCm : existing.larguraCm;
  const alturaCm = changes.alturaCm !== undefined ? changes.alturaCm : existing.alturaCm;

  const updated: Carga = {
    ...existing,
    ...changes,
    comprimentoCm,
    larguraCm,
    alturaCm,
    m3: calcularM3(comprimentoCm, larguraCm, alturaCm),
    updatedAt: nowIso(),
  };

  db.prepare(
    `UPDATE cargas SET codigo = @codigo, nome = @nome, comprimento_cm = @comprimento_cm, largura_cm = @largura_cm,
       altura_cm = @altura_cm, m3 = @m3, peso_kg = @peso_kg, valor = @valor, moeda = @moeda,
       estado_pagamento = @estado_pagamento, tipo_embalagem = @tipo_embalagem, notas = @notas,
       contentor_id = @contentor_id, emissor_id = @emissor_id, updated_at = @updated_at WHERE id = @id`,
  ).run({
    id: updated.id,
    codigo: updated.codigo,
    nome: updated.nome,
    comprimento_cm: updated.comprimentoCm,
    largura_cm: updated.larguraCm,
    altura_cm: updated.alturaCm,
    m3: updated.m3,
    peso_kg: updated.pesoKg,
    valor: updated.valor,
    moeda: updated.moeda,
    estado_pagamento: updated.estadoPagamento,
    tipo_embalagem: updated.tipoEmbalagem,
    notas: updated.notas,
    contentor_id: updated.contentorId,
    emissor_id: updated.emissorId,
    updated_at: updated.updatedAt,
  });

  return updated;
}

function nextCodigo(): string {
  const db = getDatabase();
  const prefix = settingsRepository.get('prefixo_codigo_carga') ?? 'TF';
  const rows = db.prepare<[], { codigo: string }>('SELECT codigo FROM cargas').all();
  return computeNextCode(prefix, rows.map((r) => r.codigo));
}

function search(texto: string, limit = 8): Carga[] {
  const db = getDatabase();
  const rows = db
    .prepare<
      [string, string, number],
      CargaRow
    >('SELECT * FROM cargas WHERE nome LIKE ? OR codigo LIKE ? ORDER BY created_at DESC LIMIT ?')
    .all(`%${texto}%`, `%${texto}%`, limit);
  return rows.map(fromRow);
}

function countMesAtual(): number {
  const db = getDatabase();
  const row = db
    .prepare<[], { total: number }>(
      `SELECT COUNT(*) as total FROM cargas WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
    )
    .get();
  return row?.total ?? 0;
}

function countEntreguesMesAtual(): number {
  const db = getDatabase();
  const row = db
    .prepare<[], { total: number }>(
      `SELECT COUNT(*) as total FROM cargas
       WHERE estado = 'entregue' AND strftime('%Y-%m', updated_at) = strftime('%Y-%m', 'now')`,
    )
    .get();
  return row?.total ?? 0;
}

function sumValorDevido(): number {
  const db = getDatabase();
  const row = db
    .prepare<[], { total: number | null }>(`SELECT SUM(valor) as total FROM cargas WHERE estado_pagamento = 'devido'`)
    .get();
  return row?.total ?? 0;
}

function createBatch(items: CreateCargaBatchItem[]): Carga[] {
  const db = getDatabase();
  const runBatch = db.transaction((batch: CreateCargaBatchItem[]) => {
    return batch.map((item, index) => {
      try {
        const carga = create(item);
        if (item.recetorId) addDestinatario(carga.id, item.recetorId);
        return carga;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        throw new Error(`Linha ${index + 1} (código "${item.codigo}"): ${message}`);
      }
    });
  });

  return runBatch(items);
}

function addDestinatario(cargaId: string, contactoId: string): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO carga_destinatarios (id, carga_id, contacto_id, created_at) VALUES (?, ?, ?, ?)`,
  ).run(randomUUID(), cargaId, contactoId, nowIso());
}

function listDestinatariosPorCarga(cargaIds: string[]): Record<string, string[]> {
  if (cargaIds.length === 0) return {};
  const db = getDatabase();
  const placeholders = cargaIds.map(() => '?').join(',');
  const rows = db
    .prepare<
      unknown[],
      { carga_id: string; nome: string }
    >(
      `SELECT carga_destinatarios.carga_id as carga_id, contactos.nome as nome
       FROM carga_destinatarios
       JOIN contactos ON contactos.id = carga_destinatarios.contacto_id
       WHERE carga_destinatarios.carga_id IN (${placeholders})`,
    )
    .all(...cargaIds);

  const result: Record<string, string[]> = {};
  for (const row of rows) {
    (result[row.carga_id] ??= []).push(row.nome);
  }
  return result;
}

function listUltimas(limit = 5): CargaComEmissor[] {
  const db = getDatabase();
  const rows = db
    .prepare<
      [number],
      CargaRow & { emissor_nome: string }
    >(
      `SELECT cargas.*, contactos.nome as emissor_nome FROM cargas
       JOIN contactos ON contactos.id = cargas.emissor_id
       ORDER BY cargas.created_at DESC LIMIT ?`,
    )
    .all(limit);
  return rows.map((row) => ({ ...fromRow(row), emissorNome: row.emissor_nome }));
}

interface OrigemPwaLinha {
  userId: string;
  nome: string;
  total: number;
}

function listOrigensPwa(): OrigemPwaLinha[] {
  const db = getDatabase();
  return db
    .prepare<
      [],
      OrigemPwaLinha
    >(
      `SELECT cargas.origem_pwa_user_id as userId, users.name as nome, COUNT(*) as total
       FROM cargas JOIN users ON users.id = cargas.origem_pwa_user_id
       WHERE cargas.origem_pwa_user_id IS NOT NULL
       GROUP BY cargas.origem_pwa_user_id ORDER BY users.name ASC`,
    )
    .all();
}

export const cargaRepository = {
  create,
  createBatch,
  findById,
  list,
  update,
  nextCodigo,
  search,
  countMesAtual,
  countEntreguesMesAtual,
  sumValorDevido,
  listUltimas,
  addDestinatario,
  listDestinatariosPorCarga,
  listOrigensPwa,
};
