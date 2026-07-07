# NexAgent — Website

Interne KI-Systeme für den Mittelstand. Operations-Leitstand-Design
(Anthrazit `#0B0F14` + Signal-Bernstein `#F5A623`), Vite + React,
Vercel Serverless Functions, Supabase (Postgres, EU/Frankfurt).

## Lokal starten

```bash
npm install
npm run dev
```

Hinweis: Ohne Umgebungsvariablen laufen Chat und Formular-Speicherung lokal
nicht — die Seite selbst (Design, Animationen, Rechner) funktioniert komplett.

## Struktur

```
index.html            Einstieg
src/
  main.jsx            Bootstrap + selbst gehostete Fonts (DSGVO)
  App.jsx             Hash-Routing: Startseite / #intern / #impressum / #datenschutz
  styles.css          Komplettes Design-System (Tokens oben in :root)
  content.js          ALLE Texte zentral — hier ändern, nicht in Komponenten
  sections.jsx        Nav, Hero+Betriebsmonitor, Trust, Systeme, Pipeline,
                      ROI-Rechner, Ablauf, Preise, FAQ, Kontakt, Footer
  chat.jsx            NEXA-Chat (Vollbild auf Mobile, Eskalations-Formular)
  dashboard.jsx       Internes Dashboard (#intern)
  legal.jsx           Impressum + Datenschutz (Platzhalter füllen!)
api/
  chat.js             Anthropic-Proxy (Key nur serverseitig, Rate-Limit)
  inquiries.js        Anfragen: POST öffentlich (Honeypot), GET/PATCH/DELETE nur Admin
  _lib.js             Admin-Check (zeitkonstant), Rate-Limit, Supabase-REST
```

## Deployment (Vercel)

Siehe `SETUP.md` — Schritt-für-Schritt-Anleitung inkl. Supabase-SQL und
Umgebungsvariablen.

## Vor dem Livegang (Pflicht!)

1. Platzhalter in `src/legal.jsx` mit echten Angaben füllen (Impressum-Pflicht!)
2. Supabase-Projekt + Tabelle anlegen (`SETUP.md`)
3. Umgebungsvariablen in Vercel setzen
4. Ausgabenlimit in der Anthropic-Console setzen
