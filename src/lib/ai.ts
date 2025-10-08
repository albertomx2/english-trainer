// src/lib/ai.ts
// Motor IA para "Use-it": OpenRouter vía proxy (Netlify) + fallback LanguageTool.
// + Generación de Reading (texto + 5 preguntas) usando los mismos proxies.

import type {
  UseItResult,
  ReadingExercise,
  ReadingQuestion,
  ReadingLevel,
  ReadingLength,
} from '../types'

/** ========= CONFIG GENERAL (proxies + modelos) ========= */

// Proxies en orden (primero Netlify; opcional Cloudflare si lo recuperas)
const OPENROUTER_PROXIES = [
  "https://english-trainer-new.netlify.app/.netlify/functions/openrouter-proxy",
  // "https://et-openrouter-proxy.albertosara728.workers.dev", // opcional backup
] as const;

// Modelos FREE a probar en orden
const OPENROUTER_MODELS = [
  "deepseek/deepseek-chat-v3.1:free",
  "qwen/qwen3-8b:free",
  "deepseek/deepseek-chat-v3-0324:free",
] as const;

/* =========================================================
 *              USE-IT  (sin cambios)
 * ========================================================= */

export type UseItInput = {
  word: string;
  sentence: string;
  definition?: string;
  example?: string;
};

async function callViaProxyOnce(
  proxyUrl: string,
  model: string,
  input: UseItInput
): Promise<UseItResult> {
  const system =
    "You are an English writing coach. Evaluate the student's sentence focusing on the TARGET expression. Return ONLY JSON with fields: score(0..5), errors[], suggested_sentence, explanation, tags[]. Be concise.";

  const schema = {
    type: "object",
    properties: {
      score: { type: "integer", minimum: 0, maximum: 5 },
      errors: { type: "array", items: { type: "string" } },
      suggested_sentence: { type: "string" },
      explanation: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
    },
    required: ["score", "errors", "suggested_sentence", "explanation", "tags"],
    additionalProperties: false,
  };

  const user = [
    `TARGET: "${input.word}"`,
    `DEFINITION: ${input.definition ?? "—"}`,
    `REFERENCE_EXAMPLE: ${input.example ?? "—"}`,
    `SENTENCE_TO_EVALUATE: """${input.sentence.trim()}"""`,
    `Return strictly valid JSON for this JSON Schema: ${JSON.stringify(schema)}.`,
  ].join("\n");

  const headers: HeadersInit = { "Content-Type": "application/json" };

  const body = JSON.stringify({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 400,
  });

  const r = await fetch(proxyUrl, { method: "POST", headers, body });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Proxy ${proxyUrl} → ${r.status}: ${text || r.statusText}`);
  }

  const data = await r.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";

  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}$/);
    if (m) return JSON.parse(m[0]);
    throw new Error(`Modelo ${model}: respuesta no JSON. Raw: ${text.slice(0, 200)}…`);
  }
}

export async function evaluateUseItOpenAI(input: UseItInput): Promise<UseItResult> {
  const proxyErrors: string[] = [];

  for (const proxy of OPENROUTER_PROXIES) {
    try {
      const modelErrors: string[] = [];
      for (const m of OPENROUTER_MODELS) {
        try {
          return await callViaProxyOnce(proxy, m, input);
        } catch (e: any) {
          modelErrors.push(e?.message || String(e));
        }
      }
      proxyErrors.push(`Proxy ${proxy} falló:\n  - ${modelErrors.join("\n  - ")}`);
    } catch (e: any) {
      proxyErrors.push(`Proxy ${proxy} error: ${e?.message || String(e)}`);
    }
  }

  throw new Error(`Fallaron los proxies/modelos:\n${proxyErrors.join("\n")}`);
}

export async function evaluateWithLanguageTool(
  sentence: string,
  locale: "en-US" | "en-GB" = "en-US"
): Promise<UseItResult> {
  const params = new URLSearchParams();
  params.set("text", sentence);
  params.set("language", locale);

  const r = await fetch("https://api.languagetool.org/v2/check", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await r.json();

  const errors =
    (data.matches as any[] | undefined)?.slice(0, 10).map((m) => {
      const cat = m?.rule?.category?.name ?? "Issue";
      return `${cat}: ${m?.message ?? ""}`.trim();
    }) ?? [];

  let suggestion = sentence;
  const firstRep = (data.matches || []).find((m: any) => m.replacements?.[0]?.value);
  if (firstRep?.replacements?.[0]?.value) {
    const rep = firstRep.replacements[0].value as string;
    suggestion = `Suggestion: ${rep}\nOriginal: ${sentence}`;
  }

  const score = errors.length === 0 ? 4 : errors.length <= 2 ? 3 : 1;
  return {
    score,
    errors,
    suggested_sentence: suggestion,
    explanation:
      "Grammar/spelling check (LanguageTool). Does not validate semantic fit to the target expression.",
    tags: ["grammar", "spelling"],
  };
}

/* =========================================================================
   READING (IA): texto y 5 preguntas no triviales
   ========================================================================= */

type LengthSpec = { wordsMin: number; wordsMax: number; paragraphsMin: number; paragraphsMax: number };
const LENGTH_MAP: Record<ReadingLength, LengthSpec> = {
  short:  { wordsMin: 140, wordsMax: 200, paragraphsMin: 2, paragraphsMax: 3 },
  medium: { wordsMin: 240, wordsMax: 340, paragraphsMin: 3, paragraphsMax: 4 },
  long:   { wordsMin: 380, wordsMax: 520, paragraphsMin: 4, paragraphsMax: 5 },
};

async function callReadingOnce(
  proxyUrl: string,
  model: string,
  params: { words: string[]; level: ReadingLevel; length: ReadingLength; dialect?: "en-US" | "en-GB" }
): Promise<ReadingExercise> {

  const spec = LENGTH_MAP[params.length];

  const system = `
You are an expert ESL content writer and exam item-writer.
Write graded reading passages and high-quality comprehension MCQs.
Return VALID JSON ONLY (no markdown/code fences).
`.trim();

  const user = `
Build one reading exercise using ALL the TARGET WORDS (use each at least once; you may inflect/pluralize).
The passage MUST respect BOTH constraints:

1) WORD COUNT: between ${spec.wordsMin} and ${spec.wordsMax} words (±10% allowed).
2) PARAGRAPHS: ${spec.paragraphsMin}–${spec.paragraphsMax} paragraphs, separated by exactly TWO newlines "\\n\\n".

LEVEL: ${params.level}
DIALECT: ${params.dialect ?? "en-US"} (spelling/wording)

STYLE:
- Natural, coherent ${params.level} English.
- Weave the target words smoothly; do not over-repeat them.
- No filler; meet the word/paragraph constraints.

QUESTIONS:
- Exactly 5 MCQs.
- At least 3 must be SKILL "inference" or "paraphrase" (meaning-in-context, cause/effect, author's intent, best restatement).
- Avoid trivial quote-matching or numeric fact recall.
- Distractors must be plausible and close in meaning so that only one is truly correct.

TARGET WORDS: ${params.words.join(", ")}

OUTPUT JSON SHAPE:
{
  "passage": "string with \\n\\n between paragraphs",
  "used_words": string[],          // the target words that actually appear in the passage (original casing)
  "questions": [
    { "id":"q1", "q":"...", "options": ["A","B","C","D"], "answerIndex": 0, "explanation":"why this is correct" },
    ...
  ],
  "model": "${model}"
}
`.trim();

  const headers: HeadersInit = { "Content-Type": "application/json" };
  const body = JSON.stringify({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 1200,
  });

  const r = await fetch(proxyUrl, { method: "POST", headers, body });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Proxy ${proxyUrl} → ${r.status}: ${t || r.statusText}`);
  }

  const data = await r.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}$/);
    if (m) json = JSON.parse(m[0]);
    else throw new Error(`Reading: respuesta no JSON. Raw: ${text.slice(0, 200)}…`);
  }

  // Normalización y validación mínima
  const passage = String(json.passage || "").trim();
  const usedWords: string[] = Array.isArray(json.used_words) ? json.used_words.map(String) : params.words;
  const rawQs: any[] = Array.isArray(json.questions) ? json.questions : [];
  if (!passage || rawQs.length !== 5) {
    throw new Error("Formato incompleto del ejercicio (passage o nº de preguntas).");
  }

  const questions: ReadingQuestion[] = rawQs.map((q, i): ReadingQuestion => ({
    id: String(q.id || `q${i + 1}`),
    q: String(q.q || ""),
    options: (Array.isArray(q.options) && q.options.length === 4
      ? q.options
      : ["A", "B", "C", "D"]).map(String) as [string, string, string, string],
    answerIndex: (typeof q.answerIndex === "number" ? q.answerIndex : 0) as 0 | 1 | 2 | 3,
    explanation: q.explanation ? String(q.explanation) : undefined,
  }));

  // Construye ReadingExercise según tus tipos
  const now = new Date().toISOString();
  const exercise: ReadingExercise = {
    id: Date.now().toString(),
    level: params.level,
    length: params.length,
    model: String(json.model || model),
    used_words: usedWords,
    passage,                     // párrafos separados por \n\n
    questions,
    createdAtISO: now,
  };

  return exercise;
}

/** API pública: genera el ejercicio de lectura con fallback por proxy y modelo */
export async function generateReadingExercise(opts: {
  words: string[];
  level: ReadingLevel;
  length: ReadingLength;
  dialect?: "en-US" | "en-GB";
  model?: string; // si quieres forzar uno
}): Promise<ReadingExercise> {
  const proxyErrors: string[] = [];
  const models = opts.model ? [opts.model] : OPENROUTER_MODELS;

  for (const proxy of OPENROUTER_PROXIES) {
    for (const model of models) {
      try {
        return await callReadingOnce(proxy, model, {
          words: opts.words,
          level: opts.level,
          length: opts.length,
          dialect: opts.dialect,
        });
      } catch (e: any) {
        proxyErrors.push(`${proxy} • ${model}: ${e?.message || String(e)}`);
      }
    }
  }
  throw new Error(`Reading (IA) no disponible:\n- ${proxyErrors.join("\n- ")}`);
}
