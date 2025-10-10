import type { Handler } from '@netlify/functions'
import { YoutubeTranscript } from 'youtube-transcript'

function cors(origin: string, reqHeaders?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': reqHeaders || 'Content-Type',
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

function getVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
    if (u.hostname === 'youtu.be') return u.pathname.slice(1)
    return null
  } catch { return null }
}

export const handler: Handler = async (event) => {
  const origin = event.headers.origin || ''
  const acrh = event.headers['access-control-request-headers'] || undefined

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors(origin, acrh), body: '' }
  }
  if (!ALLOWED.has(origin)) {
    return { statusCode: 403, headers: cors(origin, acrh), body: 'Forbidden' }
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: cors(origin, acrh), body: 'Only GET' }
  }

  const url = event.queryStringParameters?.url || ''
  const vid = getVideoId(url)
  if (!vid) {
    return { statusCode: 400, headers: cors(origin, acrh), body: 'Invalid YouTube URL' }
  }

  try {
    const items = await YoutubeTranscript.fetchTranscript(vid, { lang: 'en' })
    const text = items.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim()
    return {
      statusCode: 200,
      headers: { ...cors(origin, acrh), 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: vid, text }),
    }
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: { ...cors(origin, acrh), 'Content-Type': 'text/plain' },
      body: e?.message || 'Failed to fetch transcript',
    }
  }
}
