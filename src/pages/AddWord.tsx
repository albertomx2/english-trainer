import { useState } from 'react'
import type { WordItem, Category } from '../types'
import { enrichWordWithAI } from '../lib/ai'
import { getActiveUser, upsertWord } from '../lib/supa'
import { useNavigate } from 'react-router-dom'

/** Normaliza la palabra a un id estable */
function normalizeId(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // acentos
    .replace(/[^a-z0-9]+/g, '-')     // separadores
    .replace(/(^-|-$)/g, '') || 'item'
}

/** Traducción muy corta */
function tidyEs(s: string): string {
  let t = (s || '').trim()
  t = t.replace(/\(.*?\)/g, '')
  t = t.split(/[;\n\.,/]/)[0]
  t = t.split(/\s+/).slice(0, 3).join(' ')
  return t.toLowerCase().trim()
}

export default function AddWord() {
  const nav = useNavigate()
  const [word, setWord] = useState('')
  const [category, setCategory] = useState<Category>('Noun')
  const [seq, setSeq] = useState<string>('')

  const [definition, setDefinition] = useState('')
  const [example, setExample] = useState('')
  const [translation, setTranslation] = useState('')

  const [saving, setSaving] = useState(false)
  const [loadingDef, setLoadingDef] = useState(false)
  const [loadingEx, setLoadingEx] = useState(false)
  const [loadingEs, setLoadingEs] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  async function genFromAI(kind: 'def' | 'ex' | 'es') {
    setError(null)
    const w = word.trim()
    if (!w) { setError('Primero escribe la palabra.'); return }

    try {
      if (kind === 'def') setLoadingDef(true)
      if (kind === 'ex') setLoadingEx(true)
      if (kind === 'es') setLoadingEs(true)

      const res = await enrichWordWithAI(w)

      if (kind === 'def') setDefinition(res.definition_en || '')
      if (kind === 'ex') setExample(res.example_en || '')
      if (kind === 'es') setTranslation(tidyEs(res.translation_es || ''))
    } catch (e: any) {
      setError(`IA (enrich): ${e?.message || 'fallo'}`)
    } finally {
      setLoadingDef(false); setLoadingEx(false); setLoadingEs(false)
    }
  }

  async function genAllAI() {
    setError(null)
    const w = word.trim()
    if (!w) { setError('Primero escribe la palabra.'); return }
    setLoadingDef(true); setLoadingEx(true); setLoadingEs(true)
    try {
      const res = await enrichWordWithAI(w)
      setDefinition(res.definition_en || '')
      setExample(res.example_en || '')
      setTranslation(tidyEs(res.translation_es || ''))
    } catch (e: any) {
      setError(`IA (enrich): ${e?.message || 'fallo'}`)
    } finally {
      setLoadingDef(false); setLoadingEx(false); setLoadingEs(false)
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setOkMsg(null)

    const u = getActiveUser()
    if (!u) { setError('No hay usuario activo. Entra de nuevo.'); return }

    const w = word.trim()
    if (!w) { setError('La palabra es obligatoria.'); return }

    const item: WordItem = {
      id: normalizeId(w),
      word: w,
      definition_en: (definition || '').trim(),
      example_en: (example || '').trim(),
      translation_es: tidyEs(translation),
      category,
      seq: seq ? Number(seq) : null,
    }

    setSaving(true)
    try {
      await upsertWord(u.id, item)
      setOkMsg(`Guardado: ${w}`)
      // opcional: volver a Modos o limpiar formulario
      setTimeout(() => nav('/modes'), 700)
    } catch (e: any) {
      setError(e?.message || 'Error guardando la palabra.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="wrap p-4">
      <h1 className="text-2xl font-semibold mb-3">Añadir palabra</h1>

      {error && <div className="alert alert-error mb-3 whitespace-pre-wrap">{error}</div>}
      {okMsg && <div className="alert alert-success mb-3">{okMsg}</div>}

      <form className="card space-y-4" onSubmit={onSave}>
        {/* Palabra + categoría + orden opcional */}
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Palabra *</label>
            <input
              className="input"
              value={word}
              onChange={e => setWord(e.target.value)}
              placeholder="Dog"
              required
            />
          </div>
          <div>
            <label className="label">Categoría</label>
            <select className="input" value={category} onChange={e => setCategory(e.target.value as Category)}>
              <option value="Noun">Noun</option>
              <option value="Verb">Verb</option>
              <option value="Adjective">Adjective</option>
              <option value="Idiom">Idiom</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Orden (opcional)</label>
            <input
              className="input"
              value={seq}
              onChange={e => setSeq(e.target.value)}
              placeholder="p.ej. 120"
            />
          </div>
        </div>

        {/* Definición EN */}
        <div>
          <label className="label">
            Definición (EN)
            <button
              type="button"
              className="btn btn-ghost ml-2"
              onClick={() => genFromAI('def')}
              disabled={loadingDef || !word.trim()}
              title="Rellenar con IA"
            >
              {loadingDef ? 'IA…' : 'IA'}
            </button>
          </label>
          <textarea
            className="input min-h-20"
            value={definition}
            onChange={e => setDefinition(e.target.value)}
            placeholder="A domesticated animal that barks…"
          />
        </div>

        {/* Ejemplo EN */}
        <div>
          <label className="label">
            Ejemplo (EN)
            <button
              type="button"
              className="btn btn-ghost ml-2"
              onClick={() => genFromAI('ex')}
              disabled={loadingEx || !word.trim()}
              title="Rellenar con IA"
            >
              {loadingEx ? 'IA…' : 'IA'}
            </button>
          </label>
          <textarea
            className="input min-h-20"
            value={example}
            onChange={e => setExample(e.target.value)}
            placeholder="We adopted a dog from the shelter."
          />
        </div>

        {/* Traducción ES */}
        <div>
          <label className="label">
            Traducción (ES)
            <button
              type="button"
              className="btn btn-ghost ml-2"
              onClick={() => genFromAI('es')}
              disabled={loadingEs || !word.trim()}
              title="Rellenar con IA"
            >
              {loadingEs ? 'IA…' : 'IA'}
            </button>
          </label>
          <input
            className="input"
            value={translation}
            onChange={e => setTranslation(e.target.value)}
            placeholder="perro"
          />
          <div className="text-xs text-gray-600 mt-1">
            Mantén la traducción corta (1–3 palabras).
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={genAllAI}
            disabled={!word.trim() || loadingDef || loadingEx || loadingEs}
          >
            {loadingDef || loadingEx || loadingEs ? 'IA…' : 'Rellenar todo con IA'}
          </button>
        </div>
      </form>
    </div>
  )
}
