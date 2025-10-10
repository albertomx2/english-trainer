import { openDB, type IDBPDatabase, type DBSchema } from 'idb'
import type {
  WordItem,
  DatasetMeta,
  ItemProgress,
  ReadingExercise,
  ReadingResult
} from '../types'

const DB_NAME = 'english-trainer-db'
const DB_VERSION = 3 // para crear stores de Reading

interface ETDB extends DBSchema {
  items: { key: string; value: WordItem }
  meta: { key: string; value: DatasetMeta }
  progress: { key: string; value: ItemProgress }
  reading: { key: string; value: ReadingExercise }
  reading_results: { key: string; value: ReadingResult }
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
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('reading')) {
            db.createObjectStore('reading', { keyPath: 'id' })
          }
          if (!db.objectStoreNames.contains('reading_results')) {
            db.createObjectStore('reading_results', { keyPath: 'exerciseId' })
          }
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

/* ===== Reading (ejercicio + resultados) ===== */

const LS_LAST_READING_ID = 'et_last_reading_id'

export async function saveReading(ex: ReadingExercise) {
  const db = await getDB()
  await db.put('reading', ex)
  localStorage.setItem(LS_LAST_READING_ID, ex.id)
}

export async function getReading(id: string): Promise<ReadingExercise | undefined> {
  const db = await getDB()
  return db.get('reading', id)
}

export async function getLastReading(): Promise<ReadingExercise | undefined> {
  const id = localStorage.getItem(LS_LAST_READING_ID)
  if (!id) return undefined
  return getReading(id)
}

export async function saveReadingResult(res: ReadingResult) {
  const db = await getDB()
  await db.put('reading_results', res)
}

export async function getReadingResult(exerciseId: string): Promise<ReadingResult | undefined> {
  const db = await getDB()
  return db.get('reading_results', exerciseId)
}

/* ===== Nuevas utilidades para items (palabras) ===== */

export async function getItem(id: string): Promise<WordItem | undefined> {
  const db = await getDB()
  return db.get('items', id)
}

/** Inserta o actualiza un único item sin borrar el resto. */
export async function upsertItem(item: WordItem): Promise<void> {
  const db = await getDB()
  await db.put('items', item)

  // Actualiza meta de forma sencilla
  const rows = await db.count('items')
  const now = new Date().toISOString()
  const prev = await getMeta()
  const meta: DatasetMeta = {
    version: prev?.version ?? 2,
    lastSyncISO: now,
    lastSyncDateKey: now.slice(0, 10),
    rows,
  }
  await setMeta(meta)
}
