// src/lib/ai.ts
export type UseItInput = {
  word: string; sentence: string; definition?: string; example?: string;
};
export type UseItResult = {
  score: number; errors: string[]; suggested_sentence: string; explanation: string; tags: string[];
};

// 👇 PON AQUÍ tu dominio Netlify
const OPENROUTER_PROXY_URL = "https://english-trainer-new.netlify.app/.netlify/functions/openrouter-proxy";


const OPENROUTER_MODELS = [
  "deepseek/deepseek-chat-v3.1:free",
  "qwen/qwen3-8b:free",
  "deepseek/deepseek-chat-v3-0324:free",
] as const;

async function callProxyOnce(model: string, input: UseItInput): Promise<UseItResult> {
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

  const r = await fetch(OPENROUTER_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Title": "English Trainer (Personal)" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 400,
    }),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Proxy → ${r.status}: ${text || r.statusText}`);
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
  const errs: string[] = [];
  for (const m of OPENROUTER_MODELS) {
    try { return await callProxyOnce(m, input); }
    catch (e: any) { errs.push(e?.message || String(e)); }
  }
  throw new Error("Falló OpenRouter vía proxy:\n- " + errs.join("\n- "));
}

// Fallback gratis ya lo tienes:
export async function evaluateWithLanguageTool(sentence: string, locale: "en-US" | "en-GB" = "en-US"): Promise<UseItResult> {
  const params = new URLSearchParams(); params.set("text", sentence); params.set("language", locale);
  const r = await fetch("https://api.languagetool.org/v2/check", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString()
  });
  const data = await r.json();
  const errors = (data.matches as any[] | undefined)?.slice(0, 10).map(m => `${m?.rule?.category?.name ?? "Issue"}: ${m?.message ?? ""}`.trim()) ?? [];
  let suggestion = sentence;
  const first = (data.matches || []).find((m: any) => m.replacements?.[0]?.value);
  if (first?.replacements?.[0]?.value) suggestion = `Suggestion: ${first.replacements[0].value}\nOriginal: ${sentence}`;
  const score = errors.length === 0 ? 4 : errors.length <= 2 ? 3 : 1;
  return { score, errors, suggested_sentence: suggestion, explanation: "Grammar/spelling check (LanguageTool). Does not validate semantic fit to the target expression.", tags: ["grammar", "spelling"] };
}
