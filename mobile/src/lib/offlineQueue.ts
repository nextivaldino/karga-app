import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CargaPendente, ContentorDisponivel, ItemFilaOffline, NovaCargaPendenteInput } from '@/types';

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

export async function marcarErroNaFila(id: string, erro: string): Promise<void> {
  const db = await getDb();
  const atual = await db.get('fila', id);
  if (!atual) return;
  await db.put('fila', { ...atual, estado: 'erro', ultimoErro: erro });
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
