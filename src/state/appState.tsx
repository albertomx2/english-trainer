import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getAllItems, getMeta, saveItems, setMeta } from '../lib/storage'
import { fetchAndParseXlsx, todayKey } from '../lib/xlsxLoader'
import type { WordItem, DatasetMeta } from '../types'

type AppState = {
  items: WordItem[]
  filteredItems: WordItem[]
  categories: string[]
  selectedCategory: string | null
  setSelectedCategory: (c: string | null) => void

  points: number
  streak: number
  addPoints: (n: number) => void
  markDailyGoalDone: () => void
  lastSync: string | null

  refreshing: boolean
  refreshFromXlsx: () => Promise<void>
}

const Ctx = createContext<AppState | null>(null)

const LS_POINTS = 'et_points'
const LS_STREAK = 'et_streak'
const LS_STREAK_LAST = 'et_streak_lastDay'
const DAILY_GOAL = 20 // tarjetas por defecto

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WordItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  // puntos/racha
  const [points, setPoints] = useState<number>(() => Number(localStorage.getItem(LS_POINTS) || 0))
  const [streak, setStreak] = useState<number>(() => Number(localStorage.getItem(LS_STREAK) || 0))

  const addPoints = (n: number) => {
    const v = Math.max(0, points + n)
    setPoints(v)
    localStorage.setItem(LS_POINTS, String(v))
  }

  // muy simple: si hoy marcas meta cumplida, aumenta racha si es día nuevo
  const markDailyGoalDone = () => {
    const today = todayKey()
    const last = localStorage.getItem(LS_STREAK_LAST)
    if (last === today) return // ya contado hoy
    const next = (last && last !== today) ? streak + 1 : streak + 1
    setStreak(next)
    localStorage.setItem(LS_STREAK, String(next))
    localStorage.setItem(LS_STREAK_LAST, today)
  }

  const categories = useMemo(() => {
    const set = new Set<string>()
    items.forEach(i => { if (i.category) set.add(i.category) })
    return ['Todas', ...Array.from(set).sort()]
  }, [items])

  const filteredItems = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'Todas') return items
    return items.filter(i => i.category === selectedCategory)
  }, [items, selectedCategory])

  async function loadInitial() {
    const meta = await getMeta()
    if (!meta || meta.lastSyncDateKey !== todayKey()) {
      await refreshFromXlsx()
    } else {
      const all = await getAllItems()
      setItems(all)
      setLastSync(new Date(meta.lastSyncISO).toLocaleString())
    }
  }

  async function refreshFromXlsx() {
    setRefreshing(true)
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
      setItems(items)
      setLastSync(new Date(meta.lastSyncISO).toLocaleString())
      console.info('Import:', report)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { loadInitial() }, [])

  const value: AppState = {
    items,
    filteredItems,
    categories,
    selectedCategory,
    setSelectedCategory,
    points,
    streak,
    addPoints,
    markDailyGoalDone,
    lastSync,
    refreshing,
    refreshFromXlsx,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppState() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAppState debe usarse dentro de AppStateProvider')
  return ctx
}
