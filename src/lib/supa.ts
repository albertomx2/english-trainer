import { supabase } from './supabaseClient'
import type { WordItem, Category } from '../types'

/* ===== USERS ===== */

export async function getOrCreateUserByUsername(username: string): Promise<{id: string, username: string}> {
  const u = username.trim()
  if (!u) throw new Error('Username vacío')

  const { data: found, error: selErr } = await supabase
    .from('users')
    .select('id, username')
    .eq('username', u)
    .limit(1)
    .maybeSingle()

  if (selErr) throw selErr
  if (found) return found as any

  const { data, error: insErr } = await supabase
    .from('users')
    .insert({ username: u })
    .select('id, username')
    .single()

  if (insErr) throw insErr
  return data as any
}

export function setActiveUser(user: {id: string, username: string}) {
  localStorage.setItem('et_user', JSON.stringify(user))
}
export function getActiveUser(): {id: string, username: string} | null {
  try { return JSON.parse(localStorage.getItem('et_user') || 'null') }
  catch { return null }
}
export function clearActiveUser() {
  localStorage.removeItem('et_user')
}

/* ===== WORDS ===== */

function mapDbToWordItem(r: any): WordItem {
  return {
    id: r.id,
    word: r.word,
    definition_en: r.definition_en ?? '',
    example_en: r.example_en ?? '',
    translation_es: r.translation_es ?? '',
    category: (r.category as Category) ?? 'Other',
    seq: r.seq ?? null,
  }
}
function mapWordItemToDb(w: WordItem, user_id: string) {
  return {
    id: w.id,
    user_id,
    word: w.word,
    definition_en: w.definition_en || null,
    example_en: w.example_en || null,
    translation_es: w.translation_es || null,
    category: w.category || null,
    seq: w.seq === '' || w.seq == null ? null : Number(w.seq),
  }
}

export async function listWords(user_id: string): Promise<WordItem[]> {
  const { data, error } = await supabase
    .from('words')
    .select('id, word, definition_en, example_en, translation_es, category, seq')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapDbToWordItem)
}

export async function upsertWord(user_id: string, item: WordItem): Promise<void> {
  const payload = mapWordItemToDb(item, user_id)
  const { error } = await supabase.from('words').upsert(payload, {onConflict: 'user_id,id'})
  if (error) throw error
}

export async function deleteWord(user_id: string, id: string): Promise<void> {
  const { error } = await supabase.from('words').delete().eq('user_id', user_id).eq('id', id)
  if (error) throw error
}
