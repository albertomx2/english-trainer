import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react'
import {
  getAllItems,
  getMeta,
  saveItems,
  setMeta,
  getProgressMap,
  getProgress,
  setProgress,
} from '../lib/storage'
import { fetchAndParseXlsx, todayKey } from '../lib/xlsxLoader'
import { applyAnswer, isDue, applyFailure } from '../lib/srs'
import type { WordItem, DatasetMeta, SRSEaseQuality } from '../types'

type Verdict = 'exact' | 'near' | 'fail'

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

  dailyGoal: number
  dailyCount: number
  incDailyCount: () => void

  lastSync: string | null
  refreshing: boolean
  refreshFromXlsx: () => Promise<void>

  getDueQueue: (limit: number) => Promise<WordItem[]>
  answerItem: (itemId: string, quality: SRSEaseQuality, score: number) => Promise<void>
  answerGraded: (itemId: string, verdict: Verdict, score: 0|2|3) => Promise<void>
}

const Ctx = createContext<AppState | null>(null)

const LS_POINTS = 'et_points'
const LS_STREAK = 'et_streak'
const LS_STREAK_LAST = 'et_streak_lastDay'
const LS_DAILY_GOAL = 'et_daily_goal'
const LS_DAILY_COUNT_PREFIX = 'et_daily_count_'

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WordItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const [points, setPoints] = useState<number>(() =>
    Number(localStorage.getItem(LS_POINTS) || 0)
  )
  const [streak, setStreak] = useState<number>(() =>
    Number(localStorage.getItem(LS_STREAK) || 0)
  )
  const [dailyGoal] = useState<number>(() =>
    Number(localStorage.getItem(LS_DAILY_GOAL) || 20)
  )
  const [dailyCount, setDailyCount] = useState<number>(() => {
    const k = LS_DAILY_COUNT_PREFIX + todayKey()
    return Number(localStorage.getItem(k) || 0)
  })

  const markDailyGoalDone = useCallback(() => {
    const today = todayKey()
    const last = localStorage.getItem(LS_STREAK_LAST)
    if (last === today) return
    setStreak(prev => {
      const next = prev + 1
      localStorage.setItem(LS_STREAK, String(next))
      localStorage.setItem(LS_STREAK_LAST, today)
      return next
    })
  }, [])

  const addPoints = useCallback((n: number) => {
    setPoints(prev => {
      const v = Math.max(0, prev + n)
      localStorage.setItem(LS_POINTS, String(v))
      return v
    })
  }, [])

  const incDailyCount = useCallback(() => {
    const k = LS_DAILY_COUNT_PREFIX + todayKey()
    setDailyCount(prev => {
      const v = prev + 1
      localStorage.setItem(k, String(v))
      if (v >= dailyGoal) markDailyGoalDone()
      return v
    })
  }, [dailyGoal, markDailyGoalDone])

  useEffect(() => {
    const id = setInterval(() => {
      const k = LS_DAILY_COUNT_PREFIX + todayKey()
      const stored = Number(localStorage.getItem(k) || 0)
      setDailyCount(stored)
    }, 60_000)
    return () => clearInterval(id)
  }, [])

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

  const getDueQueue = useCallback(async (limit: number) => {
    const list = filteredItems
    const progressMap = await getProgressMap(list.map(i => i.id))
    const due = list.filter(i => {
      const p = progressMap.get(i.id)
      return isDue(p?.srs)
    })
    for (let i = due.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[due[i], due[j]] = [due[j], due[i]]
    }
    return due.slice(0, limit)
  }, [filteredItems])

  const answerItem = useCallback(async (itemId: string, quality: 3|4|5, score: number) => {
    const prev = await getProgress(itemId)
    const next = applyAnswer(prev, itemId, quality, score)
    await setProgress(next)
    addPoints(score)
    incDailyCount()
  }, [addPoints, incDailyCount])

  // NUEVO: respuesta con veredicto (exact/near/fail) para Type-it
  const answerGraded = useCallback(async (itemId: string, verdict: Verdict, score: 0|2|3) => {
    const prev = await getProgress(itemId)
    let next
    if (verdict === 'exact') {
      next = applyAnswer(prev, itemId, 5, score)
    } else if (verdict === 'near') {
      next = applyAnswer(prev, itemId, 4, score)
    } else {
      next = applyFailure(prev, itemId) // reseteo suave: mañana
    }
    await setProgress(next)
    addPoints(score)
    incDailyCount()
  }, [addPoints, incDailyCount])

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
    dailyGoal,
    dailyCount,
    incDailyCount,
    lastSync,
    refreshing,
    refreshFromXlsx,
    getDueQueue,
    answerItem,
    answerGraded,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppState() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAppState debe usarse dentro de AppStateProvider')
  return ctx
}
