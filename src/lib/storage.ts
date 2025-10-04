import { openDB, type IDBPDatabase, type DBSchema } from 'idb'
import type { WordItem, DatasetMeta } from '../types'

const DB_NAME = 'english-trainer-db'
const DB_VERSION = 1

interface ETDB extends DBSchema {
  items: { key: string; value: WordItem }
  meta: { key: string; value: DatasetMeta }
}

let _dbPromise: Promise<IDBPDatabase<ETDB>> | null = null

function getDB() {
  if (!_dbPromise) {
    _dbPromise = openDB<ETDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta')
        }
      },
    })
  }
  return _dbPromise
}

export async function saveItems(items: WordItem[]) {
  const db = await getDB()
  // ⚠️ Usa string (no array) para que exista tx.store
  const tx = db.transaction('items', 'readwrite')
  await tx.store.clear()
  for (const item of items) {
    await tx.store.put(item)
  }
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
