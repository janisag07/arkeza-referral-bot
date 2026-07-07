import { checkAdminCode, rateLimit, clientIp, supabase, isValidEmail, clip } from './_lib.js'

export default async function handler(req, res) {
  try {
    switch (req.method) {
      case 'POST':
        return await createInquiry(req, res)
      case 'GET':
      case 'PATCH':
      case 'DELETE':
        // Admin-Bereich: Zugangscode wird serverseitig geprüft.
        if (!checkAdminCode(req)) {
          return res.status(401).json({ error: 'Nicht autorisiert' })
        }
        if (req.method === 'GET') return await listInquiries(req, res)
        if (req.method === 'PATCH') return await updateInquiry(req, res)
        return await deleteInquiry(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (err) {
    console.error('inquiries handler', err)
    return res.status(500).json({ error: 'Interner Fehler' })
  }
}

async function createInquiry(req, res) {
  if (!rateLimit(`inq:${clientIp(req)}`, { max: 5, windowMs: 60_000 })) {
    return res.status(429).json({ error: 'Zu viele Anfragen — bitte kurz warten.' })
  }
  const b = req.body || {}

  // Honeypot: echte Menschen sehen dieses Feld nicht. Bots, die es füllen,
  // bekommen ein stilles "ok" — kein Hinweis, dass sie erkannt wurden.
  if (b.website) return res.status(200).json({ ok: true })

  const name = clip(b.name, 120).trim()
  const email = clip(b.email, 254).trim()
  const message = clip(b.message, 8000).trim()
  if (!name || !message || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Bitte Name, gültige E-Mail und Nachricht angeben.' })
  }

  await supabase('inquiries', {
    method: 'POST',
    body: {
      type: ['kontakt', 'chat'].includes(b.type) ? b.type : 'kontakt',
      name,
      firma: clip(b.firma, 160).trim(),
      email,
      tel: clip(b.tel, 60).trim(),
      message,
      status: 'neu',
    },
    headers: { Prefer: 'return=minimal' },
  })
  return res.status(201).json({ ok: true })
}

async function listInquiries(req, res) {
  const rows = await supabase('inquiries?select=*&order=created_at.desc&limit=500')
  return res.status(200).json({ inquiries: rows })
}

function idFilter(req) {
  const id = String(req.query?.id || '')
  // UUID-Format erzwingen — verhindert PostgREST-Filter-Injection.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null
  return id
}

async function updateInquiry(req, res) {
  const id = idFilter(req)
  const status = String(req.body?.status || '')
  if (!id || !['neu', 'offen', 'erledigt'].includes(status)) {
    return res.status(400).json({ error: 'Ungültige Anfrage' })
  }
  await supabase(`inquiries?id=eq.${id}`, {
    method: 'PATCH',
    body: { status },
    headers: { Prefer: 'return=minimal' },
  })
  return res.status(200).json({ ok: true })
}

async function deleteInquiry(req, res) {
  const id = idFilter(req)
  if (!id) return res.status(400).json({ error: 'Ungültige Anfrage' })
  await supabase(`inquiries?id=eq.${id}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  })
  return res.status(200).json({ ok: true })
}
