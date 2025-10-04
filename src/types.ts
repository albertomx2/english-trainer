export type Category = 'Idiom' | 'Adjective' | 'Noun' | 'Verb' | string;

export interface WordItem {
  id: string;                 // key estable (word normalizada)
  word: string;
  definition_en: string;
  example_en: string;
  translation_es: string;
  category: Category;
  seq?: string | number | null;

  // futuros campos de progreso/IA se añadirán aquí
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
