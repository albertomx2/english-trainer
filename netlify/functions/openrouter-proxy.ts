// Netlify Function (Node runtime) → Proxy a OpenRouter con CORS
import type { Handler } from '@netlify/functions'

function corsHeaders(origin: string, reqHeaders?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': reqHeaders || 'Content-Type, X-Title, HTTP-Referer, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
  }
}

const ALLOWED = new Set<string>([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://albertomx2.github.io',
  'https://english-trainer-new.netlify.app',
])

export const handler: Handler = async (event) => {
  const origin = event.headers.origin || ''
  const acrh = event.headers['access-control-request-headers'] || undefined

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin, acrh), body: '' }
  }

  // Origen no permitido
  if (!ALLOWED.has(origin)) {
    return { statusCode: 403, headers: corsHeaders(origin, acrh), body: 'Forbidden' }
  }

  // Solo POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(origin, acrh), body: 'Only POST' }
  }

  const apiKey = process.env.OPENROUTER_KEY || ''
  if (!apiKey) {
    // devolvemos CORS también en errores -> evita “Failed to fetch”
    return {
      statusCode: 500,
      headers: { ...corsHeaders(origin, acrh), 'Content-Type': 'text/plain' },
      body: 'Missing OPENROUTER_KEY',
    }
  }

  const body = event.body || ''

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'English Trainer (Netlify)',
      'HTTP-Referer': 'https://english-trainer-new.netlify.app',
    },
    body,
  })

  const text = await resp.text()
  return {
    statusCode: resp.status,
    headers: { ...corsHeaders(origin, acrh), 'Content-Type': 'application/json' },
    body: text,
  }
}
