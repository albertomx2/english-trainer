// api/openrouter-proxy.ts (Vercel Edge Function)
export const config = { runtime: "edge" };

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

const ALLOWED = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://albertomx2.github.io",
]);

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("origin") || "";

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(origin) });
  }
  if (!ALLOWED.has(origin)) {
    return new Response("Forbidden", { status: 403, headers: cors(origin) });
  }
  if (req.method !== "POST") {
    return new Response("Only POST", { status: 405, headers: cors(origin) });
  }

  const body = await req.text();

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_KEY!}`,
      "Content-Type": "application/json",
      "X-Title": "English Trainer (Vercel)",
    },
    body,
  });

  const txt = await resp.text();
  return new Response(txt, {
    status: resp.status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}
