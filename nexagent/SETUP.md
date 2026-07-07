# NexAgent — Setup & Deployment (Schritt für Schritt)

Jedes Kommando einzeln ausführen. Reihenfolge einhalten.

## 1. Supabase (Datenbank)

1. Auf https://supabase.com ein Projekt anlegen — **Region: EU (Frankfurt)**.
2. Im SQL-Editor dieses Statement ausführen:

```sql
create table inquiries (
  id uuid default gen_random_uuid() primary key,
  type text, name text, firma text, email text,
  tel text, message text,
  status text default 'neu',
  created_at timestamptz default now()
);
alter table inquiries enable row level security;
-- Zugriff läuft ausschließlich über den Service-Key (Server).
-- KEINE Public-Policy anlegen.
```

3. Unter *Project Settings → API* zwei Werte kopieren:
   - **Project URL** → wird `SUPABASE_URL`
   - **service_role Key** → wird `SUPABASE_SERVICE_KEY` (geheim! nie ins Frontend!)

## 2. Anthropic (Chat)

1. Auf https://console.anthropic.com einen API-Key erstellen → wird `ANTHROPIC_API_KEY`.
2. **Wichtig:** Unter *Limits* ein monatliches Ausgabenlimit setzen (z. B. 20 €) —
   Schutz vor Spam-Kosten durch den öffentlichen Chat.

## 3. Vercel (Hosting)

```bash
cd nexagent
```

```bash
npm install
```

```bash
npm i -g vercel
```

```bash
vercel login
```

```bash
vercel --prod
```

Danach im Vercel-Dashboard unter *Settings → Environment Variables* setzen:

| Variable | Wert |
|---|---|
| `ANTHROPIC_API_KEY` | Key aus Schritt 2 |
| `SUPABASE_URL` | Project URL aus Schritt 1 |
| `SUPABASE_SERVICE_KEY` | service_role Key aus Schritt 1 |
| `ADMIN_CODE` | Selbst gewähltes, langes Passwort fürs Dashboard |

Dann erneut deployen, damit die Variablen greifen:

```bash
vercel --prod
```

## 4. Prüfen

- Website öffnen → Hero, Pipeline, Rechner testen (auch am Handy, 375 px).
- Kontaktformular absenden → Anfrage erscheint unter `/#intern` (Footer → „Betriebszugang").
- NEXA-Chat: Frage stellen; „Ich möchte einen Termin" → Eskalations-Formular erscheint.
- `#impressum` / `#datenschutz` öffnen → **Platzhalter müssen vor Bewerbung der Seite gefüllt sein!**

## 5. Eigene Domain (später)

Vercel-Dashboard → *Domains* → z. B. `nexagent.de` verbinden, DNS-Anweisungen folgen.
