import * as XLSX from 'xlsx'
import type { WordItem, ImportReport } from '../types'

const REPO_BASE = import.meta.env.BASE_URL // "/english-trainer/"
const XLSX_URL = `${REPO_BASE}dataset.xlsx`

function norm(s: any): string {
  return String(s ?? '').trim()
}

function idFromWord(word: string) {
  return word.toLowerCase().replace(/\s+/g, ' ').trim()
}

type RawRow = Record<string, any>

/** Intenta mapear las cabeceras del Excel a nuestros nombres esperados */
function mapRow(row: RawRow): Omit<WordItem, 'id'> | null {
  // Claves case-insensitive
  const keys = Object.fromEntries(
    Object.keys(row).map(k => [k.toLowerCase(), k])
  )

  // posibles variantes de cabecera -> clave real
  const get = (variants: string[]) => {
    for (const v of variants) {
      const k = keys[v.toLowerCase()]
      if (k && row[k] != null) return row[k]
    }
    return undefined
  }

  const word = norm(get(['Word/Expression', 'Word', 'Expression']) )
  const def  = norm(get(['Definition (EN)', 'Definition', 'Definition EN']))
  const ex   = norm(get(['Example (EN)', 'Example', 'Example EN']))
  const tr   = norm(get(['Translation (ES)', 'Translation', 'Traducción', 'ES']))
  const cat  = norm(get(['Category', 'Tipo', 'Clase']))
  const seq  = get(['Seq', 'Order', 'Index'])

  if (!word) return null
  return {
    word,
    definition_en: def,
    example_en: ex,
    translation_es: tr,
    category: cat || 'Other',
    seq: seq ?? null,
  }
}

export async function fetchAndParseXlsx(): Promise<{
  items: WordItem[]
  report: ImportReport
}> {
  // Descarga binaria del Excel con cache-busting opcional si quieres
  const res = await fetch(XLSX_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(`No se pudo descargar dataset.xlsx (${res.status})`)
  const buf = await res.arrayBuffer()

  // Lee el libro y toma la primera hoja
  const wb = XLSX.read(buf, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows: RawRow[] = XLSX.utils.sheet_to_json(ws, {
    defval: '',
    raw: false,
  })

  const seen = new Set<string>()
  const items: WordItem[] = []
  const warnings: string[] = []

  let totalRows = rows.length
  let valid = 0
  let duplicates = 0
  let discarded = 0

  for (let i = 0; i < rows.length; i++) {
    const mapped = mapRow(rows[i])
    if (!mapped) {
      discarded++
      continue
    }
    const id = idFromWord(mapped.word)
    if (seen.has(id)) {
      duplicates++
      continue
    }
    seen.add(id)
    valid++

    // Limpiezas suaves
    if (!mapped.definition_en && mapped.translation_es) {
      warnings.push(`Fila ${i + 2}: sin definition_en para "${mapped.word}"`)
    }

    items.push({ id, ...mapped })
  }

  const report: ImportReport = {
    totalRows,
    valid,
    duplicates,
    discarded,
    warnings,
  }

  return { items, report }
}

/** Devuelve 'YYYY-MM-DD' en zona local */
export function todayKey(): string {
  const d = new Date()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
