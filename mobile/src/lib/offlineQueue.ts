import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CargaPendente, ContentorDisponivel, ItemFilaOffline, NovaCargaPendenteInput, TipoErroFila } from '@/types';

const BACKOFF_BASE_MS = 30_000;
const BACKOFF_TETO_MS = 30 * 60_000;

interface KragaDB extends DBSchema {
  fila: {
    key: string;
    value: ItemFilaOffline;
  };
  cache: {
    key: string;
    value: { chave: string; valor: unknown; guardadoEm: string };
  };
}

let dbPromise: Promise<IDBPDatabase<KragaDB>> | null = null;

function getDb(): Promise<IDBPDatabase<KragaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<KragaDB>('kraga-mobile', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('fila')) db.createObjectStore('fila', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache', { keyPath: 'chave' });
      },
    });
  }
  return dbPromise;
}

export async function adicionarAFila(item: NovaCargaPendenteInput): Promise<ItemFilaOffline> {
  const db = await getDb();
  const registo: ItemFilaOffline = {
    id: crypto.randomUUID(),
    item,
    estado: 'fila',
    criadoEm: new Date().toISOString(),
    ultimoErro: null,
    tentativas: 0,
    ultimaTentativaEm: null,
    tipoErro: null,
  };
  await db.put('fila', registo);
  return registo;
}

export async function listarFila(): Promise<ItemFilaOffline[]> {
  const db = await getDb();
  const itens = await db.getAll('fila');
  return itens.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
}

export async function removerDaFila(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('fila', id);
}

export async function marcarErroNaFila(id: string, erro: string, tipoErro: TipoErroFila): Promise<void> {
  const db = await getDb();
  const atual = await db.get('fila', id);
  if (!atual) return;
  await db.put('fila', {
    ...atual,
    estado: 'erro',
    ultimoErro: erro,
    tipoErro,
    tentativas: atual.tentativas + 1,
    ultimaTentativaEm: new Date().toISOString(),
  });
}

// Só relevante para itens 'erro' — 'fila' (nunca tentado, ou à espera de
// rede) tenta sempre. Erros permanentes nunca são retomados sozinhos
// (precisam de reenviarItem explícito); erros transitórios seguem
// backoff exponencial com teto de 30 min, para não martelar a rede.
export function podeTentarAgora(item: ItemFilaOffline): boolean {
  if (item.estado !== 'erro') return true;
  if (item.tipoErro === 'permanente') return false;
  if (!item.ultimaTentativaEm) return true;
  const espera = Math.min(BACKOFF_BASE_MS * 2 ** item.tentativas, BACKOFF_TETO_MS);
  return Date.now() - new Date(item.ultimaTentativaEm).getTime() >= espera;
}

// Cache de leitura (contentores/cargas) — só para a app não ficar em
// branco quando abre offline. Nunca é a fonte de verdade.
export async function guardarCache(chave: string, valor: unknown): Promise<void> {
  const db = await getDb();
  await db.put('cache', { chave, valor, guardadoEm: new Date().toISOString() });
}

export async function lerCacheContentores(): Promise<ContentorDisponivel[]> {
  const db = await getDb();
  const registo = await db.get('cache', 'contentores');
  return (registo?.valor as ContentorDisponivel[] | undefined) ?? [];
}

export async function lerCacheCargas(): Promise<CargaPendente[]> {
  const db = await getDb();
  const registo = await db.get('cache', 'cargas');
  return (registo?.valor as CargaPendente[] | undefined) ?? [];
}
