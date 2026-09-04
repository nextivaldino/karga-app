import { randomUUID } from 'node:crypto';
import { getDatabase, nowIso } from '../database';
import { computeNextCode } from '../codeSequence';
import { settingsRepository } from './settingsRepository';
import { contentorRepository } from './contentorRepository';
import { contactoRepository } from './contactoRepository';
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
  criado_por_user_id: string | null;
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
    criadoPorUserId: row.criado_por_user_id,
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

function create(input: CreateCargaInput, criadoPorUserId: string | null = null): Carga {
  if (codigoExiste(input.codigo)) {
    throw new Error(`Já existe uma carga com o código "${input.codigo}".`);
  }
  if (input.contentorId) {
    const destino = contentorRepository.findById(input.contentorId);
    if (destino?.bloqueado) {
      throw new Error(`O contentor ${destino.codigo} está bloqueado — desbloqueie-o antes de adicionar cargas.`);
    }
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
    criado_por_user_id: criadoPorUserId,
    created_at: timestamp,
    updated_at: timestamp,
    sync_status: 'local',
  };

  db.prepare(
    `INSERT INTO cargas (id, codigo, nome, comprimento_cm, largura_cm, altura_cm, m3, peso_kg, valor, moeda,
       estado_pagamento, tipo_embalagem, notas, estado, contentor_id, emissor_id, origem_pwa_user_id, criado_por_user_id, created_at, updated_at, sync_status)
     VALUES (@id, @codigo, @nome, @comprimento_cm, @largura_cm, @altura_cm, @m3, @peso_kg, @valor, @moeda,
       @estado_pagamento, @tipo_embalagem, @notas, @estado, @contentor_id, @emissor_id, @origem_pwa_user_id, @criado_por_user_id, @created_at, @updated_at, @sync_status)`,
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
  incluirArquivadas?: boolean;
}

function list(filters: ListFilters = {}): CargaComEmissor[] {
  const db = getDatabase();
  const clauses: string[] = [];
  const params: unknown[] = [];

  // Soft-delete: cargas arquivadas ficam fora das listagens normais por
  // omissão (histórico preservado, nunca apagado fisicamente).
  if (!filters.incluirArquivadas) {
    clauses.push(`cargas.estado != 'arquivada'`);
  }
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
  const cargas = rows.map((row) => ({ ...fromRow(row), emissorNome: row.emissor_nome }));
  const destinatariosPorCarga = listDestinatariosPorCarga(cargas.map((c) => c.id));
  return cargas.map((c) => ({ ...c, destinatarios: destinatariosPorCarga[c.id] ?? [] }));
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
      if (destino.bloqueado) {
        throw new Error(`O contentor ${destino.codigo} está bloqueado — desbloqueie-o antes de adicionar cargas.`);
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

// "Código único para este emissor" — a primeira carga do emissor fixa
// um código-base (gravado no contacto, `contactos.codigo_base`); as
// seguintes ficam "base-A", "base-B"... `cargas.codigo` continua a ter
// a restrição UNIQUE da base de dados intacta — o agrupamento é visual
// (todas leem-se como pertencentes ao mesmo código-base), não uma
// duplicação real.
// `reservados` cobre códigos já atribuídos a cargas empilhadas nesta
// sessão do formulário mas ainda não gravadas na base de dados — sem
// isto, duas cargas empilhadas seguidas do mesmo emissor receberiam
// sempre a mesma sugestão (a consulta só vê o que já está gravado).
function nextCodigoAgrupado(emissorId: string, reservados: string[] = []): string {
  const db = getDatabase();
  const contacto = contactoRepository.findById(emissorId);
  if (!contacto) throw new Error('Emissor não encontrado.');

  let base = contacto.codigoBase;
  if (!base) {
    base = nextCodigo();
    contactoRepository.definirCodigoBase(emissorId, base);
  }

  const rows = db
    .prepare<[string, string], { codigo: string }>('SELECT codigo FROM cargas WHERE codigo = ? OR codigo LIKE ?')
    .all(base, `${base}-%`);
  const usados = new Set([...rows.map((r) => r.codigo), ...reservados]);

  if (!usados.has(base)) return base;

  for (let i = 0; i < 26; i++) {
    const candidato = `${base}-${String.fromCharCode(65 + i)}`;
    if (!usados.has(candidato)) return candidato;
  }
  let n = 1;
  while (usados.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function search(texto: string, limit = 8): Carga[] {
  const db = getDatabase();
  const rows = db
    .prepare<
      [string, string, number],
      CargaRow
    >(`SELECT * FROM cargas WHERE estado != 'arquivada' AND (nome LIKE ? OR codigo LIKE ?) ORDER BY created_at DESC LIMIT ?`)
    .all(`%${texto}%`, `%${texto}%`, limit);
  return rows.map(fromRow);
}

// Só para a pesquisa global do cabeçalho — cruza com o emissor (procurar
// pelo nome de um cliente traz também as cargas dele) e traz o código do
// contentor onde cada carga está, para a coluna de Cargas já mostrar
// "onde está" sem precisar de um segundo clique. `search()` acima fica
// intocado para não alterar o autocomplete de cargas existente.
interface CargaSearchResult extends Carga {
  emissorNome: string;
  contentorCodigo: string | null;
}

function searchGlobal(texto: string, limit = 8): CargaSearchResult[] {
  const db = getDatabase();
  const padrao = `%${texto}%`;
  const rows = db
    .prepare<
      [string, string, string, number],
      CargaRow & { emissor_nome: string; contentor_codigo: string | null }
    >(
      `SELECT cargas.*, contactos.nome as emissor_nome, contentores.codigo as contentor_codigo
       FROM cargas
       JOIN contactos ON contactos.id = cargas.emissor_id
       LEFT JOIN contentores ON contentores.id = cargas.contentor_id
       WHERE cargas.estado != 'arquivada'
         AND (cargas.nome LIKE ? OR cargas.codigo LIKE ? OR contactos.nome LIKE ?)
       ORDER BY cargas.created_at DESC LIMIT ?`,
    )
    .all(padrao, padrao, padrao, limit);
  return rows.map((row) => ({ ...fromRow(row), emissorNome: row.emissor_nome, contentorCodigo: row.contentor_codigo }));
}

interface SugestaoDimensoes {
  comprimentoCm: number;
  larguraCm: number;
  alturaCm: number;
  ocorrencias: number;
}

// "Aprende" com o histórico: quando o mesmo nome de carga (ex: "Bidon")
// já apareceu antes com o mesmo conjunto de dimensões pelo menos duas
// vezes, sugere-o de novo — nunca o peso (varia demasiado mesmo para
// objetos parecidos) e nunca como regra obrigatória, só uma sugestão
// que o formulário oferece e o utilizador aceita ou ignora.
function sugerirDimensoes(nome: string): SugestaoDimensoes | null {
  const nomeNormalizado = nome.trim();
  if (!nomeNormalizado) return null;

  const db = getDatabase();
  const row = db
    .prepare<
      [string],
      { comprimento_cm: number; largura_cm: number; altura_cm: number; ocorrencias: number }
    >(
      `SELECT comprimento_cm, largura_cm, altura_cm, COUNT(*) as ocorrencias
       FROM cargas
       WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))
         AND comprimento_cm IS NOT NULL AND largura_cm IS NOT NULL AND altura_cm IS NOT NULL
         AND estado != 'arquivada'
       GROUP BY comprimento_cm, largura_cm, altura_cm
       HAVING ocorrencias >= 2
       ORDER BY ocorrencias DESC, MAX(created_at) DESC
       LIMIT 1`,
    )
    .get(nomeNormalizado);

  if (!row) return null;
  return {
    comprimentoCm: row.comprimento_cm,
    larguraCm: row.largura_cm,
    alturaCm: row.altura_cm,
    ocorrencias: row.ocorrencias,
  };
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
    .prepare<[], { total: number | null }>(
      `SELECT SUM(valor) as total FROM cargas WHERE estado_pagamento = 'devido' AND estado != 'arquivada'`,
    )
    .get();
  return row?.total ?? 0;
}

function createBatch(items: CreateCargaBatchItem[], criadoPorUserId: string | null = null): Carga[] {
  const db = getDatabase();
  const runBatch = db.transaction((batch: CreateCargaBatchItem[]) => {
    return batch.map((item, index) => {
      try {
        const carga = create(item, criadoPorUserId);
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

function listUltimasSincronizadas(limit = 8): CargaComEmissor[] {
  const db = getDatabase();
  const rows = db
    .prepare<
      [number],
      CargaRow & { emissor_nome: string }
    >(
      `SELECT cargas.*, contactos.nome as emissor_nome FROM cargas
       JOIN contactos ON contactos.id = cargas.emissor_id
       WHERE cargas.estado != 'arquivada' AND cargas.origem_pwa_user_id IS NOT NULL
       ORDER BY cargas.created_at DESC LIMIT ?`,
    )
    .all(limit);
  const cargas = rows.map((row) => ({ ...fromRow(row), emissorNome: row.emissor_nome }));
  const destinatariosPorCarga = listDestinatariosPorCarga(cargas.map((c) => c.id));
  return cargas.map((c) => ({ ...c, destinatarios: destinatariosPorCarga[c.id] ?? [] }));
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

interface CargasPorContentorLinha {
  contentorId: string;
  contentorCodigo: string;
  contentorNome: string;
  total: number;
}

// Contribuição PWA de um utilizador do desktop, discriminada por
// contentor — usado no card de perfil dos avatares na Home.
function countPorContentorParaUsuario(userId: string): CargasPorContentorLinha[] {
  const db = getDatabase();
  return db
    .prepare<
      [string],
      CargasPorContentorLinha
    >(
      `SELECT contentores.id as contentorId, contentores.codigo as contentorCodigo, contentores.nome as contentorNome, COUNT(*) as total
       FROM cargas JOIN contentores ON contentores.id = cargas.contentor_id
       WHERE cargas.origem_pwa_user_id = ? AND cargas.estado != 'arquivada'
       GROUP BY contentores.id ORDER BY total DESC`,
    )
    .all(userId);
}

// Soft-delete: "eliminar" uma carga nunca apaga a linha, só marca
// estado = 'arquivada' — histórico mantido, fica fora das listagens
// normais (ver `list()`), tal como qualquer outra entidade no sistema.
function archive(id: string): Carga | null {
  const existing = findById(id);
  if (!existing) return null;

  const db = getDatabase();
  const updatedAt = nowIso();
  db.prepare(`UPDATE cargas SET estado = 'arquivada', updated_at = ? WHERE id = ?`).run(updatedAt, id);

  return { ...existing, estado: 'arquivada', updatedAt };
}

// Reaproveita a validação já existente em `update()` (contentor de
// destino tem de estar aberto, etc.) para cada carga, dentro de uma
// única transação — ou move tudo, ou nada (falha numa reverte as outras).
function moverEmLote(ids: string[], contentorId: string): Carga[] {
  const db = getDatabase();
  const runBatch = db.transaction((cargaIds: string[]) => {
    return cargaIds.map((id) => {
      const updated = update(id, { contentorId });
      if (!updated) throw new Error(`Carga não encontrada: ${id}`);
      return updated;
    });
  });
  return runBatch(ids);
}

export const cargaRepository = {
  create,
  createBatch,
  findById,
  list,
  update,
  archive,
  moverEmLote,
  nextCodigo,
  nextCodigoAgrupado,
  search,
  searchGlobal,
  sugerirDimensoes,
  countMesAtual,
  countEntreguesMesAtual,
  sumValorDevido,
  listUltimasSincronizadas,
  addDestinatario,
  listDestinatariosPorCarga,
  listOrigensPwa,
  countPorContentorParaUsuario,
};
