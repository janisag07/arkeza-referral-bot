import { useEffect, useRef, useState } from 'react'
import { Icon } from './icons.jsx'

const GREETING = {
  role: 'assistant',
  content:
    'Guten Tag! Ich bin NEXA, der Assistent von NexAgent. Ich beantworte Ihnen gern Fragen zu unseren KI-Systemen, Preisen, dem Ablauf oder zum Datenschutz. Womit kann ich helfen?',
}

// Marker, mit dem der Server-Assistent eine Eskalation signalisiert.
const ESCALATE_MARKER = '[[ESKALATION]]'

export function Chat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [escalate, setEscalate] = useState(false)
  const [escalateSent, setEscalateSent] = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, open, escalate])

  async function send() {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Nur die letzten 12 Nachrichten senden — hält Kosten und Payload klein.
        body: JSON.stringify({ messages: next.slice(-12) }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      let reply = data.reply || 'Entschuldigung, da ist etwas schiefgelaufen.'
      if (reply.includes(ESCALATE_MARKER)) {
        reply = reply.replaceAll(ESCALATE_MARKER, '').trim()
        setEscalate(true)
      }
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            'Entschuldigung, ich bin gerade nicht erreichbar. Nutzen Sie gern das Kontaktformular weiter unten — wir melden uns innerhalb eines Werktags.',
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  async function sendEscalation(e) {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget))
    if (!data.name?.trim() || !data.email?.trim()) return
    const transcript = messages
      .map((m) => `${m.role === 'user' ? 'Besucher' : 'NEXA'}: ${m.content}`)
      .join('\n')
    try {
      await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          name: data.name,
          firma: data.firma || '',
          email: data.email,
          message: `— Eskalation aus dem NEXA-Chat —\n\n${transcript}`,
        }),
      })
      setEscalateSent(true)
      setEscalate(false)
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            'Vielen Dank! Ihre Anfrage ist samt Chatverlauf bei uns eingegangen — Sie hören innerhalb eines Werktags persönlich von uns.',
        },
      ])
    } catch {
      /* Formular bleibt offen, Nutzer kann es erneut versuchen */
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="NEXA Chat-Assistent">
          <div className="chat-head">
            <div className="chat-head-title">
              <span className="dot pulse" aria-hidden />
              <span>
                NEXA
                <span className="sub">KI-Assistent von NexAgent</span>
              </span>
            </div>
            <button type="button" className="chat-close" onClick={() => setOpen(false)} aria-label="Chat schließen">
              <Icon name="close" />
            </button>
          </div>
          <div className="chat-body" ref={bodyRef}>
            {messages.map((m, i) => (
              <div className={`msg ${m.role === 'user' ? 'user' : 'bot'}`} key={i}>
                {m.content}
              </div>
            ))}
            {busy && <div className="msg bot typing">NEXA tippt …</div>}
          </div>
          {escalate && !escalateSent && (
            <form className="chat-escalate" onSubmit={sendEscalation}>
              <p>
                <b>Das klärt am besten Janis persönlich.</b> Hinterlassen Sie Ihre
                Kontaktdaten — die Anfrage geht samt Chatverlauf direkt an ihn.
              </p>
              <input name="name" placeholder="Ihr Name *" required aria-label="Ihr Name" />
              <input name="email" type="email" placeholder="Ihre E-Mail *" required aria-label="Ihre E-Mail" />
              <input name="firma" placeholder="Firma (optional)" aria-label="Firma" />
              <button type="submit" className="btn btn-primary btn-sm">Anfrage senden</button>
            </form>
          )}
          <div className="chat-foot">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ihre Frage an NEXA …"
              aria-label="Nachricht an NEXA"
              disabled={busy}
            />
            <button type="button" className="chat-send" onClick={send} aria-label="Nachricht senden" disabled={busy}>
              <Icon name="send" />
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Chat schließen' : 'Chat mit NEXA öffnen'}
      >
        <Icon name={open ? 'close' : 'chat'} size={26} />
      </button>
    </>
  )
}
