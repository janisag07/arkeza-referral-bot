import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './icons.jsx'
import { useInView, useReducedMotion } from './hooks.js'
import {
  SYSTEMS, FEED_ITEMS, PIPELINE_STEPS, PROCESS,
  PRICING, FAQ, NAV_LINKS, TRUST_ITEMS,
} from './content.js'

/* ---------- Navigation: transparent über dem Hero, Paper nach dem Scrollen ---------- */
export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header className={`nav${scrolled ? ' scrolled' : ''}`}>
      <div className="container nav-inner">
        <a href="#" className="logo" aria-label="NexAgent — zur Startseite">
          <span className="logo-mark" aria-hidden />
          NexAgent
        </a>
        <nav className="nav-links" aria-label="Hauptnavigation">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
          <a href="#kontakt" className="btn-nav">Kostenlose Demo</a>
        </nav>
      </div>
    </header>
  )
}

/* ---------- Hero mit Live-Betriebsmonitor ---------- */
function nowTime(offsetSec = 0) {
  const d = new Date(Date.now() - offsetSec * 1000)
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function LiveMonitor() {
  const reduced = useReducedMotion()
  const [items, setItems] = useState(() =>
    FEED_ITEMS.slice(0, 4).map((it, i) => ({ ...it, time: nowTime((4 - i) * 7), key: i }))
  )
  const nextIdx = useRef(4)

  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => {
      setItems((prev) => {
        const src = FEED_ITEMS[nextIdx.current % FEED_ITEMS.length]
        nextIdx.current += 1
        const next = [{ ...src, time: nowTime(), key: Date.now() }, ...prev]
        return next.slice(0, 5)
      })
    }, 4200)
    return () => clearInterval(t)
  }, [reduced])

  return (
    <div className="monitor" role="img" aria-label="Beispielansicht: Betriebsmonitor mit automatisierten Vorgängen">
      <div className="monitor-bar">
        <span className="monitor-title">
          <span className="dot pulse" aria-hidden /> Betriebsmonitor
        </span>
        <span className="monitor-tag">Beispielansicht</span>
      </div>
      <div className="monitor-feed">
        {items.map((it) => (
          <div className="feed-item" key={it.key}>
            <span className="feed-time">{it.time}</span>
            <span className="feed-text" dangerouslySetInnerHTML={{ __html: it.text }} />
            <span className={`feed-status${it.status === 'working' ? ' working' : ''}`}>
              {it.status === 'working' ? 'läuft' : 'erledigt'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Silhouette einer Dachlinie am Horizont — abstrahierter Betrieb bei Morgendämmerung.
function Horizon() {
  return (
    <div className="hero-horizon" aria-hidden>
      <svg viewBox="0 0 1440 130" preserveAspectRatio="none">
        <path
          d="M0 130 L0 96 L90 96 L90 74 L150 74 L150 92 L260 92 L260 58 L288 58 L288 44 L316 44 L316 58 L344 58 L344 92 L470 92 L470 70 L555 70 L555 84 L640 84 L640 52 L668 52 L668 38 L700 38 L700 52 L730 52 L730 84 L860 84 L860 96 L960 96 L960 66 L1050 66 L1050 88 L1150 88 L1150 74 L1240 74 L1240 92 L1320 92 L1320 80 L1440 80 L1440 130 Z"
          fill="#0A0D14"
        />
      </svg>
    </div>
  )
}

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-sky" aria-hidden />
      <div className="hero-grain" aria-hidden />
      <Horizon />
      <div className="container">
        <p className="hero-kicker">Interne KI-Systeme für den Mittelstand</p>
        <h1>
          Bringen Sie Ihre Büroarbeit <em>zum Laufen</em> — ohne eine Hand zu rühren.
        </h1>
        <p className="hero-sub">
          NexAgent baut Systeme, die Rechnungen, Angebote und Berichte im Hintergrund
          erledigen. Angebunden an Ihre Programme, DSGVO-konform.{' '}
          <strong>Sie zahlen erst, wenn es läuft.</strong>
        </p>
        <div className="hero-actions">
          <a href="#kontakt" className="btn btn-light">Demo anfragen</a>
          <a href="#ablauf" className="btn btn-outline-light">So läuft ein System</a>
        </div>
        <p className="hero-note">Kostenlose Machbarkeits-Demo · Region Nürnberg &amp; Ansbach · deutschlandweit</p>
        <LiveMonitor />
      </div>
    </section>
  )
}

/* ---------- Vertrauens-Leiste ---------- */
export function TrustBar() {
  return (
    <div className="trustbar">
      <div className="container trustbar-inner">
        {TRUST_ITEMS.map((t) => (
          <div className="trust-item" key={t.icon}>
            <Icon name={t.icon} />
            <span dangerouslySetInnerHTML={{ __html: t.text }} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Die vier Systeme ---------- */
export function Systems() {
  const [ref, inView] = useInView()
  return (
    <section className="section" id="systeme" ref={ref}>
      <div className="container">
        <div className={`section-head reveal${inView ? ' in' : ''}`}>
          <p className="kicker">Systeme</p>
          <h2>Vier Systeme. Ein <em>ruhigerer</em> Betrieb.</h2>
          <p>
            Jedes System übernimmt einen klar umrissenen Teil Ihrer wiederkehrenden
            Arbeit — einzeln startbar, beliebig kombinierbar.
          </p>
        </div>
        <div className="systems-grid">
          {SYSTEMS.map((s, i) => (
            <article
              className={`system-card reveal${inView ? ' in' : ''}`}
              style={{ transitionDelay: `${i * 80}ms` }}
              key={s.title}
            >
              <div className="system-icon"><Icon name={s.icon} /></div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <span className="system-tag mono">{s.tag}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- Interaktive Pipeline ---------- */
const STEP_MS = 1200

export function Pipeline() {
  const [ref, inView] = useInView({ threshold: 0.35 })
  const reduced = useReducedMotion()
  // progress: -1 = wartet, 0..3 = aktiver Schritt, 4 = fertig
  const [progress, setProgress] = useState(-1)
  const timers = useRef([])

  const play = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (reduced) {
      setProgress(4)
      return
    }
    setProgress(0)
    for (let i = 1; i <= PIPELINE_STEPS.length; i++) {
      timers.current.push(setTimeout(() => setProgress(i), i * STEP_MS))
    }
  }

  useEffect(() => {
    if (inView && progress === -1) play()
    return () => timers.current.forEach(clearTimeout)
  }, [inView])

  const done = progress >= PIPELINE_STEPS.length

  return (
    <section className="section pipeline-section" id="demo" ref={ref}>
      <div className="container">
        <div className={`section-head reveal${inView ? ' in' : ''}`}>
          <p className="kicker">Live-Demo</p>
          <h2>So verbucht sich eine Rechnung <em>selbst</em>.</h2>
          <p>
            Beispielhafter Durchlauf einer eingehenden Rechnung — genau so arbeitet
            ein NexAgent-System in Ihrem Betrieb.
          </p>
        </div>
        <div className="pipeline">
          <div className="pipeline-steps">
            {PIPELINE_STEPS.map((s, i) => {
              const state = progress > i ? 'done' : progress === i ? 'active' : ''
              return (
                <div className={`pstep ${state}`} key={s.title}>
                  <div className="pstep-head">
                    <span className="pstep-num">0{i + 1}</span>
                    <h4>{s.title}</h4>
                  </div>
                  <p>{s.desc}</p>
                  <span className="pstep-state">
                    {state === 'done' ? '✓ abgeschlossen' : state === 'active' ? '● in Arbeit …' : '○ wartet'}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="pipeline-foot">
            <span className={`pipeline-result${done ? ' done' : ''}`} role="status">
              {done ? '✓ Erledigt in 3,6 s — ohne einen Handgriff.' : 'Durchlauf läuft …'}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={play}>
              <Icon name="replay" /> Nochmal abspielen
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- ROI-Rechner ---------- */
const fmtEur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const AUTOMATION_SHARE = 0.7
const WEEKS_PER_YEAR = 46 // konservativ: Urlaub/Feiertage abgezogen

export function RoiCalc() {
  const [ref, inView] = useInView()
  const [hours, setHours] = useState(12)
  const [rate, setRate] = useState(45)

  const { savedHours, savedEur } = useMemo(() => {
    const perWeek = hours * AUTOMATION_SHARE
    const yearly = perWeek * WEEKS_PER_YEAR
    return { savedHours: Math.round(yearly), savedEur: Math.round(yearly * rate) }
  }, [hours, rate])

  return (
    <section className="section" id="rechner" ref={ref}>
      <div className="container">
        <div className={`section-head reveal${inView ? ' in' : ''}`}>
          <p className="kicker">Rechner</p>
          <h2>Was kostet Sie die Routine <em>wirklich</em>?</h2>
          <p>
            Zwei Regler, eine ehrliche Zahl: Ihr jährliches Einsparpotenzial,
            konservativ gerechnet.
          </p>
        </div>
        <div className="roi">
          <div className="roi-controls">
            <div className="roi-field">
              <label htmlFor="roi-hours">
                Routine-Stunden pro Woche
                <output htmlFor="roi-hours">{hours} h</output>
              </label>
              <input
                id="roi-hours" type="range" min="2" max="40" step="1"
                value={hours} onChange={(e) => setHours(+e.target.value)}
                aria-describedby="roi-note"
              />
            </div>
            <div className="roi-field">
              <label htmlFor="roi-rate">
                Stundensatz (Vollkosten)
                <output htmlFor="roi-rate">{rate} €</output>
              </label>
              <input
                id="roi-rate" type="range" min="20" max="120" step="5"
                value={rate} onChange={(e) => setRate(+e.target.value)}
                aria-describedby="roi-note"
              />
            </div>
            <p className="roi-note" id="roi-note">
              Konservative Schätzung: Wir rechnen mit 70 % automatisierbarem Anteil
              und 46 Arbeitswochen pro Jahr — keine Schönrechnerei.
            </p>
          </div>
          <div className="roi-result" aria-live="polite">
            <p className="roi-result-label">Einsparpotenzial pro Jahr</p>
            <p className="roi-big">{fmtEur.format(savedEur)}</p>
            <div className="roi-sub">
              <div>
                <b>{savedHours} h</b>
                <span>gewonnene Arbeitszeit</span>
              </div>
              <div>
                <b>{Math.round(hours * AUTOMATION_SHARE)} h</b>
                <span>pro Woche zurück</span>
              </div>
            </div>
            <a href="#kontakt" className="btn btn-primary">Potenzial prüfen lassen</a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Ablauf ---------- */
export function Process() {
  const [ref, inView] = useInView()
  return (
    <section className="section" id="ablauf" ref={ref}>
      <div className="container">
        <div className={`section-head reveal${inView ? ' in' : ''}`}>
          <p className="kicker">Ablauf</p>
          <h2>Vom Gespräch zum laufenden System.</h2>
          <p>Vier Schritte, klare Zusagen — und das Risiko liegt dabei sichtbar bei uns.</p>
        </div>
        <div className="process-grid">
          {PROCESS.map((p, i) => (
            <div
              className={`process-step reveal${inView ? ' in' : ''}`}
              style={{ transitionDelay: `${i * 80}ms` }}
              key={p.title}
            >
              <span className="process-num">Schritt {i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- Preise ---------- */
export function Pricing() {
  const [ref, inView] = useInView()
  return (
    <section className="section" id="preise" ref={ref}>
      <div className="container">
        <div className={`section-head reveal${inView ? ' in' : ''}`}>
          <p className="kicker">Preise</p>
          <h2>Festpreise. Keine <em>Überraschungen</em>.</h2>
          <p>
            Alle Preise netto. Der Pilot ist der risikofreie Einstieg — die Systeme
            sind der laufende Betrieb.
          </p>
        </div>
        <div className="pricing-grid">
          {PRICING.map((p) => (
            <article className={`price-card${p.featured ? ' featured' : ''}`} key={p.name}>
              {p.featured && <span className="price-badge">Meistgewählt</span>}
              <h3>{p.name}</h3>
              <p className="price-value">
                {p.price}
                <small>{p.period}</small>
              </p>
              <p className="price-desc">{p.desc}</p>
              <ul className="price-list">
                {p.features.map((f) => (
                  <li key={f}><Icon name="check" size={16} /> {f}</li>
                ))}
              </ul>
              <a href="#kontakt" className={`btn ${p.featured ? 'btn-primary' : 'btn-ghost'}`}>
                {p.cta}
              </a>
            </article>
          ))}
        </div>
        <p className="pricing-foot">
          Alle Preise zzgl. USt. · Monatspakete: 3 Monate Mindestlaufzeit, danach monatlich kündbar ·
          Pilot: Zahlung erst nach erfolgreicher Abnahme · KI-System: 30 Tage Geld-zurück auf das Setup.
        </p>
      </div>
    </section>
  )
}

/* ---------- FAQ ---------- */
export function Faq() {
  const [ref, inView] = useInView()
  const [open, setOpen] = useState(0)
  return (
    <section className="section" id="faq" ref={ref}>
      <div className="container">
        <div className={`section-head reveal${inView ? ' in' : ''}`}>
          <p className="kicker">Fragen</p>
          <h2>Häufige Fragen — ehrlich beantwortet.</h2>
        </div>
        <div className="faq-list">
          {FAQ.map((f, i) => {
            const isOpen = open === i
            return (
              <div className={`faq-item${isOpen ? ' open' : ''}`} key={f.q}>
                <button
                  type="button"
                  className="faq-q"
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  {f.q}
                  <Icon name="plus" />
                </button>
                {isOpen && (
                  <div className="faq-a" id={`faq-a-${i}`}>{f.a}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------- Kontakt ---------- */
export function Contact() {
  const [ref, inView] = useInView()
  const [state, setState] = useState('idle') // idle | sending | done | error
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
    if (!data.name?.trim() || !data.email?.trim() || !data.message?.trim()) {
      setError('Bitte füllen Sie Name, E-Mail und Nachricht aus.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse an.')
      return
    }
    setError('')
    setState('sending')
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, type: 'kontakt' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setState('done')
    } catch {
      setState('idle')
      setError('Senden fehlgeschlagen — bitte versuchen Sie es erneut oder schreiben Sie uns direkt.')
    }
  }

  return (
    <section className="section contact-section" id="kontakt" ref={ref}>
      <div className="container contact-wrap">
        <div className={`section-head reveal${inView ? ' in' : ''}`} style={{ margin: '0 auto var(--s-7)' }}>
          <p className="kicker" style={{ justifyContent: 'center' }}>Kontakt</p>
          <h2>Kostenlose Machbarkeits-Demo anfragen.</h2>
          <p>
            Wir melden uns innerhalb eines Werktags — mit einer ehrlichen Einschätzung,
            ob und wo sich Automatisierung bei Ihnen lohnt.
          </p>
        </div>

        {state === 'done' ? (
          <div className="form-success" role="status">
            <h3>Anfrage eingegangen.</h3>
            <p>
              Danke für Ihr Vertrauen — Sie hören innerhalb eines Werktags von uns.
              Ganz ohne Verkaufsdruck, versprochen.
            </p>
          </div>
        ) : (
          <form className="contact-form" onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="c-name">Name <span className="req">*</span></label>
              <input id="c-name" name="name" autoComplete="name" required />
            </div>
            <div className="field">
              <label htmlFor="c-firma">Firma</label>
              <input id="c-firma" name="firma" autoComplete="organization" />
            </div>
            <div className="field">
              <label htmlFor="c-email">E-Mail <span className="req">*</span></label>
              <input id="c-email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="c-tel">Telefon</label>
              <input id="c-tel" name="tel" type="tel" autoComplete="tel" />
            </div>
            <div className="field full">
              <label htmlFor="c-msg">Nachricht <span className="req">*</span></label>
              <textarea
                id="c-msg" name="message" required
                placeholder="Welche Aufgabe frisst bei Ihnen jede Woche die meiste Zeit?"
              />
            </div>
            {/* Honeypot gegen Spam-Bots — für Menschen unsichtbar */}
            <div className="hp-field" aria-hidden="true">
              <label htmlFor="c-web">Website</label>
              <input id="c-web" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            {error && <p className="field-error full" role="alert">{error}</p>}
            <div className="field full">
              <button type="submit" className="btn btn-primary" disabled={state === 'sending'}>
                {state === 'sending' ? 'Wird gesendet …' : 'Demo anfragen'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

/* ---------- Footer ---------- */
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <a href="#" className="logo" aria-label="NexAgent">
            <span className="logo-mark" aria-hidden />
            NexAgent
          </a>
          <p className="footer-claim">
            Interne KI-Systeme für den Mittelstand · Region Nürnberg / Ansbach · deutschlandweit remote
          </p>
        </div>
        <nav className="footer-links" aria-label="Rechtliches">
          <a href="#impressum">Impressum</a>
          <a href="#datenschutz">Datenschutz</a>
          <a href="#intern" className="intern">Betriebszugang</a>
        </nav>
      </div>
    </footer>
  )
}
