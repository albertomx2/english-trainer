import { useEffect, useState } from 'react'
import { fetchAndParseXlsx, todayKey } from '../lib/xlsxLoader'
import { getAllItems, getMeta, saveItems, setMeta } from '../lib/storage'
import type { DatasetMeta } from '../types'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState<number>(0)
  const [lastSync, setLastSync] = useState<string>('-')
  const [log, setLog] = useState<string[]>([])

  async function refreshFromXlsx() {
    setLoading(true)
    setLog(l => [`Descargando y procesando dataset.xlsx…`, ...l])
    try {
      const { items, report } = await fetchAndParseXlsx()
      await saveItems(items)
      const meta: DatasetMeta = {
        version: 1,
        lastSyncISO: new Date().toISOString(),
        lastSyncDateKey: todayKey(),
        rows: items.length,
      }
      await setMeta(meta)
      setCount(items.length)
      setLastSync(new Date(meta.lastSyncISO).toLocaleString())
      setLog(l => [
        `✅ Importación completa: ${report.valid} válidas, ` +
        `${report.duplicates} duplicadas, ${report.discarded} descartadas.`,
        ...report.warnings.map(w => `⚠️ ${w}`),
        ...l,
      ])
    } catch (err: any) {
      setLog(l => [`❌ Error: ${err?.message || String(err)}`, ...l])
    } finally {
      setLoading(false)
    }
  }

  // Carga inicial: si no hay datos, o si cambió el día, recargar.
  useEffect(() => {
    (async () => {
      const meta = await getMeta()
      if (!meta) {
        setLog(l => ['No hay datos locales. Importando por primera vez…', ...l])
        await refreshFromXlsx()
      } else {
        setCount(meta.rows)
        setLastSync(new Date(meta.lastSyncISO).toLocaleString())
        if (meta.lastSyncDateKey !== todayKey()) {
          setLog(l => ['Nuevo día detectado. Actualizando automáticamente…', ...l])
          await refreshFromXlsx()
        }
      }
    })()
  }, [])

  // Ver items (debug suave)
  async function previewCount() {
    const items = await getAllItems()
    setCount(items.length)
    setLog(l => [`Hay ${items.length} items en IndexedDB.`, ...l])
  }

  return (
    <div className="min-h-dvh px-4 py-10 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">English Trainer</h1>
        <p className="text-gray-600 mb-4">Importador del Excel y caché local</p>

        <div className="grid gap-3 sm:grid-cols-3 mb-6">
          <div className="rounded-xl border p-4">
            <div className="text-sm text-gray-500">Palabras guardadas</div>
            <div className="text-2xl font-semibold">{count}</div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-sm text-gray-500">Última sincronización</div>
            <div className="text-sm">{lastSync}</div>
          </div>
          <div className="rounded-xl border p-4 flex items-center justify-center">
            <button
              onClick={refreshFromXlsx}
              disabled={loading}
              className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-60"
              title="Forzar lectura del Excel ahora mismo"
            >
              {loading ? 'Actualizando…' : '↻ Recargar palabras'}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={previewCount}
            className="px-3 py-2 rounded-md border text-sm bg-white hover:bg-gray-50"
          >
            Ver recuento en IndexedDB
          </button>
        </div>

        <div className="rounded-xl border p-4 bg-gray-50">
          <div className="text-sm font-medium mb-2">Registro</div>
          <ul className="text-sm text-gray-700 space-y-1">
            {log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>

        <footer className="mt-10 text-xs text-gray-400">
          Web responsive · Sin instalación · Deploy con GitHub Pages
        </footer>
      </div>
    </div>
  )
}
