// Netlify Edge Function -> Proxy a OpenRouter con CORS correcto
export const config = { runtime: "edge" }

// Tipado mínimo del contexto para evitar que TS se queje
type EdgeContext = {
  env: { get(name: string): string | undefined }
}

function cors(origin: string, req?: Request) {
  const acrh = req?.headers.get("access-control-request-headers")
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": acrh || "Content-Type, X-Title, HTTP-Referer",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
  }
}

const ALLOWED = new Set<string>([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://albertomx2.github.io",
  "https://english-trainer-new.netlify.app",
])

export default async function handler(req: Request, context: EdgeContext): Promise<Response> {
  const origin = req.headers.get("origin") || ""

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(origin, req) })
  }

  // Origen no permitido
  if (!ALLOWED.has(origin)) {
    return new Response("Forbidden", { status: 403, headers: cors(origin, req) })
  }

  if (req.method !== "POST") {
    return new Response("Only POST", { status: 405, headers: cors(origin, req) })
  }

  const body = await req.text()

  // ⬅️ En Edge, las env vienen en context.env
  const KEY = context.env.get("OPENROUTER_KEY") ?? ""

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      "X-Title": "English Trainer (Netlify)",
    },
    body,
  })

  const txt = await resp.text()
  return new Response(txt, {
    status: resp.status,
    headers: { ...cors(origin, req), "Content-Type": "application/json" },
  })
}
