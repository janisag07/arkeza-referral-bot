import { timingSafeEqual } from 'node:crypto'

// Zeitkonstanter Vergleich des Admin-Codes — verhindert Timing-Angriffe.
export function checkAdminCode(req) {
  const given = String(req.headers['x-admin-code'] || '')
  const expected = String(process.env.ADMIN_CODE || '')
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    // Trotzdem vergleichen, damit die Dauer nicht die Länge verrät.
    timingSafeEqual(a, a)
    return false
  }
  return timingSafeEqual(a, b)
}

// Einfaches In-Memory-Rate-Limit (best effort pro Serverless-Instanz).
const buckets = new Map()
export function rateLimit(key, { max = 20, windowMs = 60_000 } = {}) {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || now - bucket.start > windowMs) {
    buckets.set(key, { start: now, count: 1 })
    return true
  }
  bucket.count += 1
  return bucket.count <= max
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  return (typeof fwd === 'string' ? fwd.split(',')[0].trim() : '') || 'unknown'
}

// Supabase REST (PostgREST) direkt per fetch — kein zusätzliches SDK nötig.
export async function supabase(path, { method = 'GET', body, headers = {} } = {}) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen')
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254
}

export const clip = (s, n) => String(s ?? '').slice(0, n)
