import { openDB, type IDBPDatabase, type DBSchema } from 'idb'
import type { WordItem, DatasetMeta, ItemProgress } from '../types'

const DB_NAME = 'english-trainer-db'
const DB_VERSION = 2 // ⬅️ subimos versión para crear nuevo store

interface ETDB extends DBSchema {
  items: { key: string; value: WordItem }
  meta: { key: string; value: DatasetMeta }
  progress: { key: string; value: ItemProgress } // ⬅️ nuevo
}

let _dbPromise: Promise<IDBPDatabase<ETDB>> | null = null

function getDB() {
  if (!_dbPromise) {
    _dbPromise = openDB<ETDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta')
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'id' })
        }
      },
    })
  }
  return _dbPromise
}

/* ===== Items & meta ===== */

export async function saveItems(items: WordItem[]) {
  const db = await getDB()
  const tx = db.transaction('items', 'readwrite')
  await tx.store.clear()
  for (const item of items) await tx.store.put(item)
  await tx.done
}

export async function getAllItems(): Promise<WordItem[]> {
  const db = await getDB()
  return db.getAll('items')
}

export async function setMeta(meta: DatasetMeta) {
  const db = await getDB()
  await db.put('meta', meta, 'dataset')
}

export async function getMeta(): Promise<DatasetMeta | undefined> {
  const db = await getDB()
  return db.get('meta', 'dataset')
}

/* ===== Progreso SRS ===== */

export async function getProgress(id: string): Promise<ItemProgress | undefined> {
  const db = await getDB()
  return db.get('progress', id)
}

export async function setProgress(p: ItemProgress) {
  const db = await getDB()
  await db.put('progress', p)
}

export async function getProgressMap(ids: string[]): Promise<Map<string, ItemProgress>> {
  const db = await getDB()
  const tx = db.transaction('progress', 'readonly')
  const map = new Map<string, ItemProgress>()
  for (const id of ids) {
    const row = await tx.store.get(id)
    if (row) map.set(id, row)
  }
  await tx.done
  return map
}
