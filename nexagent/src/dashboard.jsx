import { useEffect, useState } from 'react'

const FILTERS = ['alle', 'neu', 'offen', 'erledigt']
const fmtDate = (iso) =>
  new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })

export function Dashboard() {
  const [code, setCode] = useState(() => sessionStorage.getItem('nx_admin') || '')
  const [authed, setAuthed] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('alle')
  const [loading, setLoading] = useState(false)

  async function load(adminCode) {
    setLoading(true)
    try {
      const res = await fetch('/api/inquiries', {
        headers: { 'x-admin-code': adminCode },
      })
      if (res.status === 401) {
        setAuthed(false)
        setLoginError('Zugangscode falsch.')
        sessionStorage.removeItem('nx_admin')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setItems(data.inquiries || [])
      setAuthed(true)
      setLoginError('')
      sessionStorage.setItem('nx_admin', adminCode)
    } catch {
      setLoginError('Verbindung fehlgeschlagen — bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (code) load(code)
  }, [])

  async function setStatus(id, status) {
    await fetch(`/api/inquiries?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-code': code },
      body: JSON.stringify({ status }),
    })
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, status } : i)))
  }

  async function remove(id) {
    if (!confirm('Diese Anfrage endgültig löschen?')) return
    await fetch(`/api/inquiries?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-code': code },
    })
    setItems((arr) => arr.filter((i) => i.id !== id))
  }

  if (!authed) {
    return (
      <div className="dash">
        <div className="container">
          <form
            className="dash-login"
            onSubmit={(e) => {
              e.preventDefault()
              if (code.trim()) load(code.trim())
            }}
          >
            <h2>Betriebszugang</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9375rem' }}>
              Interner Bereich — bitte Zugangscode eingeben.
            </p>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Zugangscode"
              aria-label="Zugangscode"
              autoFocus
            />
            {loginError && <p className="field-error" role="alert">{loginError}</p>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Prüfe …' : 'Anmelden'}
            </button>
            <a href="#" style={{ color: 'var(--text-faint)', fontSize: '0.875rem' }}>← Zurück zur Website</a>
          </form>
        </div>
      </div>
    )
  }

  const shown = filter === 'alle' ? items : items.filter((i) => i.status === filter)

  return (
    <div className="dash">
      <div className="container">
        <div className="dash-head">
          <div>
            <h1 style={{ fontSize: '1.5rem' }}>Anfragen</h1>
            <p className="mono" style={{ color: 'var(--text-faint)' }}>
              {items.length} gesamt · {items.filter((i) => i.status === 'neu').length} neu
            </p>
          </div>
          <div className="dash-filters" role="group" aria-label="Nach Status filtern">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`chip${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
            <button type="button" className="chip" onClick={() => load(code)}>
              ↻ aktualisieren
            </button>
            <a href="#" className="chip" style={{ textDecoration: 'none', lineHeight: '1.6' }}>
              ← Website
            </a>
          </div>
        </div>

        {loading && <p style={{ color: 'var(--text-dim)' }}>Lade Anfragen …</p>}
        {!loading && shown.length === 0 && (
          <p style={{ color: 'var(--text-dim)' }}>
            Keine Anfragen {filter !== 'alle' ? `mit Status „${filter}"` : ''} vorhanden.
          </p>
        )}

        {shown.map((i) => (
          <article className="inquiry" key={i.id}>
            <div className="inquiry-head">
              <div>
                <b>{i.name}</b>
                {i.firma ? <span style={{ color: 'var(--text-dim)' }}> · {i.firma}</span> : null}
                <span className={`status-pill status-${i.status}`} style={{ marginLeft: 12 }}>
                  {i.status}
                </span>
              </div>
              <span className="inquiry-meta">
                {i.type === 'chat' ? 'NEXA-Chat' : 'Kontaktformular'} · {fmtDate(i.created_at)}
              </span>
            </div>
            <p className="mono" style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
              {i.email}{i.tel ? ` · ${i.tel}` : ''}
            </p>
            <div className="inquiry-msg">{i.message}</div>
            <div className="inquiry-actions">
              {['neu', 'offen', 'erledigt'].filter((s) => s !== i.status).map((s) => (
                <button key={s} type="button" className="chip" onClick={() => setStatus(i.id, s)}>
                  → {s}
                </button>
              ))}
              <button
                type="button"
                className="chip"
                style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                onClick={() => remove(i.id)}
              >
                löschen
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
