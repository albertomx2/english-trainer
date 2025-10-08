// netlify/functions/openrouter-proxy.ts
// Netlify Edge Function -> Proxy a OpenRouter con CORS correcto
export const config = { runtime: "edge" };

// Genera cabeceras CORS; acepta exactamente los headers pedidos en el preflight
function cors(origin: string, req?: Request) {
  const acrh = req?.headers.get("access-control-request-headers");
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": acrh || "Content-Type, X-Title, HTTP-Referer",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
  };
}

// Orígenes permitidos (ajusta si añades otro dominio)
const ALLOWED = new Set<string>([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://albertomx2.github.io",
  "https://english-trainer-new.netlify.app",
]);

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("origin") || "";

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(origin, req) });
  }

  // Origen no permitido
  if (!ALLOWED.has(origin)) {
    return new Response("Forbidden", { status: 403, headers: cors(origin, req) });
  }

  // Solo POST
  if (req.method !== "POST") {
    return new Response("Only POST", { status: 405, headers: cors(origin, req) });
  }

  // Cuerpo tal cual desde el front
  const body = await req.text();

  // Llamada a OpenRouter (la key vive en Netlify → Environment variables)
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_KEY!}`,
      "Content-Type": "application/json",
      "X-Title": "English Trainer (Netlify)",
    },
    body,
  });

  const txt = await resp.text();
  return new Response(txt, {
    status: resp.status,
    headers: { ...cors(origin, req), "Content-Type": "application/json" },
  });
}
