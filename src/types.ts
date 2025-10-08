export type Category = 'Idiom' | 'Adjective' | 'Noun' | 'Verb' | string;

export interface WordItem {
  id: string;                 // key estable (word normalizada)
  word: string;
  definition_en: string;
  example_en: string;
  translation_es: string;
  category: Category;
  seq?: string | number | null;
}

export interface ImportReport {
  totalRows: number;
  valid: number;
  duplicates: number;
  discarded: number;
  warnings: string[];
}

export interface DatasetMeta {
  version: number;            // incrementa si cambias el parser
  lastSyncISO: string;        // fecha/hora de última importación
  lastSyncDateKey: string;    // YYYY-MM-DD (para recarga diaria)
  rows: number;               // N items almacenados
}

export type SRSEaseQuality = 3 | 4 | 5 // 3=Difícil, 4=Medio, 5=Fácil

export interface SRSData {
  easiness: number       // ~2.5 por defecto; baja con respuestas peores
  interval: number       // días hasta la siguiente revisión
  repetitions: number    // número de repeticiones correctas consecutivas
  lastReviewISO?: string | null
  nextReviewISO?: string | null
}

export interface ItemProgress {
  id: string            // mismo id que WordItem.id
  srs: SRSData
  correctStreak: number
  totalAnswers: number
  lastScore?: number

  // NUEVO: flags de control manual
  favorite?: boolean
  reviewToday?: boolean
}

export type UseItResult = {
  score: number;           // 0..5
  errors: string[];
  suggested_sentence: string;
  explanation: string;
  tags: string[];
};

// Preferencias de la app
export type AppTheme = 'light' | 'dark';
export type DefaultDifficulty = 'easy' | 'medium' | 'hard';


/* ===== Reading mode ===== */

export type ReadingLevel = 'B1' | 'B2' | 'C1';
export type ReadingLength = 'short' | 'medium' | 'long';

export interface ReadingQuestion {
  id: string;
  q: string;
  options: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
  explanation?: string;
}

export interface ReadingExercise {
  id: string; // p.ej. Date.now().toString()
  level: ReadingLevel;
  length: ReadingLength;
  model: string;           // modelo usado
  used_words: string[];    // palabras usadas (texto)
  passage: string;         // 2-5 párrafos en texto plano (separados por \n\n)
  questions: ReadingQuestion[]; // siempre 5
  createdAtISO: string;
}

export interface ReadingResult {
  exerciseId: string;
  answers: number[];      // índices 0..3 o -1 si sin contestar
  scoreCorrect: number;
  total: number;          // normalmente 5
  createdAtISO: string;
}