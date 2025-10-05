// src/lib/ai.ts
// Motor IA para "Use-it": OpenRouter (rutas FREE) + fallback LanguageTool.
// ⚠️ La API key queda en claro (uso personal).

export type UseItInput = {
  word: string;
  sentence: string;
  definition?: string;
  example?: string;
};

export type UseItResult = {
  score: number;           // 0..5
  errors: string[];
  suggested_sentence: string;
  explanation: string;
  tags: string[];
};

/** ====== CONFIG ====== */
// Tu API key de OpenRouter:
const OPENROUTER_API_KEY =
  "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";

// Endpoint OpenRouter (OpenAI-compatible)
const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

// Lista de rutas FREE (probamos en este orden)
const OPENROUTER_MODELS = [
  "deepseek/deepseek-chat-v3.1:free",
  "qwen/qwen3-8b:free",
  "deepseek/deepseek-chat-v3-0324:free",
] as const;

/** ====== Core request ====== */
async function callOpenRouterOnce(
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

  // ✅ URL correcta: base + "/chat/completions" (sin duplicar /v1)
  const url = `${OPENROUTER_API_BASE.replace(/\/+$/, "")}/chat/completions`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      // Recomendados por OpenRouter para frontends:
      "HTTP-Referer":
        (typeof window !== "undefined" ? window.location.origin : "http://localhost") as string,
      "X-Title": "English Trainer (Personal)",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" }, // JSON directo
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 400,
    }),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`OpenRouter ${r.status} on ${model}: ${text || r.statusText}`);
  }

  const data = await r.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}$/);
    if (m) return JSON.parse(m[0]);
    throw new Error(`Respuesta no JSON del modelo (${model}). Raw: ${text.slice(0, 200)}…`);
  }
}

/** ====== API pública: intenta múltiples modelos FREE ====== */
export async function evaluateUseItOpenAI(input: UseItInput): Promise<UseItResult> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("No hay API key de OpenRouter configurada en el código.");
  }

  const errors: string[] = [];
  for (const m of OPENROUTER_MODELS) {
    try {
      return await callOpenRouterOnce(m, input);
    } catch (e: any) {
      errors.push(e?.message || String(e));
    }
  }
  throw new Error("Fallaron las rutas FREE de OpenRouter:\n- " + errors.join("\n- "));
}

/** ====== Fallback gratuito: LanguageTool (gramática) ====== */
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
