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
import type {
  WordItem,
  DatasetMeta,
  SRSEaseQuality,
  AppTheme,
  DefaultDifficulty,
  ItemProgress,
} from '../types'

type Verdict = 'exact' | 'near' | 'fail'

type AppState = {
  // dataset
  items: WordItem[]
  filteredItems: WordItem[]
  categories: string[]
  selectedCategory: string | null
  setSelectedCategory: (c: string | null) => void

  // métricas
  points: number
  streak: number
  bestStreak: number
  addPoints: (n: number) => void
  markDailyGoalDone: () => void

  // meta diaria
  dailyGoal: number
  setDailyGoal: (n: number) => void
  dailyCount: number
  incDailyCount: () => void

  // sync
  lastSync: string | null
  refreshing: boolean
  refreshFromXlsx: () => Promise<void>

  // SRS
  getDueQueue: (limit: number) => Promise<WordItem[]>
  answerItem: (itemId: string, quality: SRSEaseQuality, score: number) => Promise<void>
  answerGraded: (itemId: string, verdict: Verdict, score: 0|2|3) => Promise<void>

  // Preferencias
  ttsOn: boolean
  setTtsOn: (b: boolean) => void
  defaultDifficulty: DefaultDifficulty
  setDefaultDifficulty: (d: DefaultDifficulty) => void
  theme: AppTheme
  setTheme: (t: AppTheme) => void

  // Explorer flags
  getFlags: (ids: string[]) => Promise<Map<string, {favorite?: boolean; reviewToday?: boolean}>>
  toggleFavorite: (id: string) => Promise<void>
  toggleReviewToday: (id: string) => Promise<void>
}

const Ctx = createContext<AppState | null>(null)

// localStorage keys
const LS_POINTS = 'et_points'
const LS_STREAK = 'et_streak'
const LS_STREAK_LAST = 'et_streak_lastDay'
const LS_BEST_STREAK = 'et_best_streak'

const LS_DAILY_GOAL = 'et_daily_goal'
const LS_DAILY_COUNT_PREFIX = 'et_daily_count_'

const LS_TTS = 'et_tts'
const LS_DEF_DIFF = 'et_default_diff'
const LS_THEME = 'et_theme'

// helper: progreso base si no existe
function emptyProgress(id: string): ItemProgress {
  return {
    id,
    srs: { easiness: 2.5, interval: 0, repetitions: 0, lastReviewISO: null, nextReviewISO: null },
    correctStreak: 0,
    totalAnswers: 0,
    lastScore: 0,
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WordItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  // métricas
  const [points, setPoints] = useState<number>(() => Number(localStorage.getItem(LS_POINTS) || 0))
  const [streak, setStreak] = useState<number>(() => Number(localStorage.getItem(LS_STREAK) || 0))
  const [bestStreak, setBestStreak] = useState<number>(() => Number(localStorage.getItem(LS_BEST_STREAK) || 0))

  // meta diaria y contador día
  const [dailyGoal, _setDailyGoal] = useState<number>(() => Number(localStorage.getItem(LS_DAILY_GOAL) || 20))
  const [dailyCount, setDailyCount] = useState<number>(() => {
    const k = LS_DAILY_COUNT_PREFIX + todayKey()
    return Number(localStorage.getItem(k) || 0)
  })
  const setDailyGoal = useCallback((n: number) => {
    const v = Math.max(1, Math.min(500, Math.floor(n)))
    _setDailyGoal(v)
    localStorage.setItem(LS_DAILY_GOAL, String(v))
  }, [])

  // preferencias
  const [ttsOn, setTtsOnState] = useState<boolean>(() => localStorage.getItem(LS_TTS) === '1')
  const setTtsOn = useCallback((b: boolean) => {
    setTtsOnState(b)
    localStorage.setItem(LS_TTS, b ? '1' : '0')
  }, [])

  const [defaultDifficulty, setDefaultDifficultyState] = useState<DefaultDifficulty>(
    () => (localStorage.getItem(LS_DEF_DIFF) as DefaultDifficulty) || 'medium'
  )
  const setDefaultDifficulty = useCallback((d: DefaultDifficulty) => {
    setDefaultDifficultyState(d)
    localStorage.setItem(LS_DEF_DIFF, d)
  }, [])

  const [theme, setThemeState] = useState<AppTheme>(() => (localStorage.getItem(LS_THEME) as AppTheme) || 'light')
  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t)
    localStorage.setItem(LS_THEME, t)
  }, [])

  // racha
  const markDailyGoalDone = useCallback(() => {
    const today = todayKey()
    const last = localStorage.getItem(LS_STREAK_LAST)
    if (last === today) return
    setStreak(prev => {
      const next = prev + 1
      localStorage.setItem(LS_STREAK, String(next))
      localStorage.setItem(LS_STREAK_LAST, today)
      // mejor racha
      setBestStreak(b => {
        const nb = Math.max(b, next)
        localStorage.setItem(LS_BEST_STREAK, String(nb))
        return nb
      })
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

  // refresco contador si cambia el día
  useEffect(() => {
    const id = setInterval(() => {
      const k = LS_DAILY_COUNT_PREFIX + todayKey()
      const stored = Number(localStorage.getItem(k) || 0)
      setDailyCount(stored)
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  // categorías
  const categories = useMemo(() => {
    const set = new Set<string>()
    items.forEach(i => { if (i.category) set.add(i.category) })
    return ['Todas', ...Array.from(set).sort()]
  }, [items])

  const filteredItems = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'Todas') return items
    return items.filter(i => i.category === selectedCategory)
  }, [items, selectedCategory])

  // carga inicial
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

  // cola SRS
  const getDueQueue = useCallback(async (limit: number) => {
    const list = filteredItems
    const progressMap = await getProgressMap(list.map(i => i.id))
    const due = list.filter(i => {
      const p = progressMap.get(i.id)
      return isDue(p?.srs)
    })
    // barajar
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

  const answerGraded = useCallback(async (itemId: string, verdict: Verdict, score: 0|2|3) => {
    const prev = await getProgress(itemId)
    let next
    if (verdict === 'exact') {
      next = applyAnswer(prev, itemId, 5, score)
    } else if (verdict === 'near') {
      next = applyAnswer(prev, itemId, 4, score)
    } else {
      next = applyFailure(prev, itemId)
    }
    await setProgress(next)
    addPoints(score)
    incDailyCount()
  }, [addPoints, incDailyCount])

  // Explorer: obtener flags y toggles
  const getFlags = useCallback(async (ids: string[]) => {
    const mp = await getProgressMap(ids)
    const res = new Map<string, {favorite?: boolean; reviewToday?: boolean}>()
    for (const id of ids) {
      const p = mp.get(id)
      res.set(id, { favorite: p?.favorite, reviewToday: p?.reviewToday })
    }
    return res
  }, [])

  const toggleFavorite = useCallback(async (id: string) => {
    const prev = await getProgress(id)
    const base = prev ?? emptyProgress(id)
    const next: ItemProgress = { ...base, favorite: !base.favorite }
    await setProgress(next)
  }, [])

  const toggleReviewToday = useCallback(async (id: string) => {
    const prev = await getProgress(id)
    const base = prev ?? emptyProgress(id)
    const next: ItemProgress = { ...base, reviewToday: !base.reviewToday }
    await setProgress(next)
  }, [])

  useEffect(() => { loadInitial() }, [])

  const value: AppState = {
    items,
    filteredItems,
    categories,
    selectedCategory,
    setSelectedCategory,

    points,
    streak,
    bestStreak,
    addPoints,
    markDailyGoalDone,

    dailyGoal,
    setDailyGoal,
    dailyCount,
    incDailyCount,

    lastSync,
    refreshing,
    refreshFromXlsx,

    getDueQueue,
    answerItem,
    answerGraded,

    ttsOn,
    setTtsOn,
    defaultDifficulty,
    setDefaultDifficulty,
    theme,
    setTheme,

    getFlags,
    toggleFavorite,
    toggleReviewToday,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppState() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAppState debe usarse dentro de AppStateProvider')
  return ctx
}
