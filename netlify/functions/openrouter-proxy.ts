// netlify/functions/openrouter-proxy.ts
// Proxy simple: añade la Authorization a OpenRouter y maneja CORS.

const ALLOWED = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://albertomx2.github.io",
  "https://english-trainer-new.netlify.app", // ← TU dominio Netlify
]);
function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": ALLOWED.has(origin) ? origin : "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export const handler = async (event: any) => {
  const origin = event.headers?.origin || "";
  const headers = cors(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (!ALLOWED.has(origin)) {
    return { statusCode: 403, headers, body: "Forbidden" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Only POST" };
  }

  const body = event.body || "{}";

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`, // 👈 viene de Netlify
      "Content-Type": "application/json",
      "X-Title": "English Trainer (Netlify)",
    },
    body,
  });

  const txt = await resp.text();
  return {
    statusCode: resp.status,
    headers: { ...headers, "Content-Type": "application/json" },
    body: txt,
  };
};
