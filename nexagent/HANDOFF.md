# NexAgent — Übergabe an neue Session

Dieses Dokument fasst alles zusammen, was bereits entschieden und gebaut wurde.
Lies es zuerst vollständig, bevor du irgendetwas änderst.

## Worum es geht

NexAgent ist ein Ein-Personen-Startup von Janis (Bankkaufmann in Ausbildung,
nebenberuflich), das interne KI-Automatisierungen an KMU im Raum
Nürnberg/Ansbach (und deutschlandweit remote) verkauft. Vier Systemtypen:
Posteingang & Dokumente, Angebote & Vertrieb, Wissensassistent, Berichte &
Routine. Preise: Pilot ab 1.490 € einmalig (Zahlung erst nach Abnahme),
KI-System ab 4.900 € + 490 €/Monat (meistgewählt), Partner ab 9.500 € +
990 €/Monat. Kernstrategie: Risiko-Umkehr statt Referenzen (0 € Risiko im
Piloten, 30 Tage Geld-zurück), weil noch keine Kunden existieren — deshalb
**niemals erfundene Kundenlogos, Testimonials oder Zahlen** verwenden.

## Design-Historie (wichtig — nicht zurückbauen!)

- **v5**: Dunkler "Operations-Leitstand" — Anthrazit + Bernstein, Karten,
  Mono-Font-Badges. Funktional, sah aber laut Janis "aus wie jede zweite
  KI-Website" (generisches AI-SaaS-Dashboard-Klischee).
- **v6 (aktueller Stand)**: Kompletter Redesign im editorialen,
  matrix.build-inspirierten Stil — Serifen-Display-Schrift (Instrument
  Serif) statt Sans-only, ein cinematischer Vollbild-Hero mit generativer
  Morgendämmerungs-Fläche (mehrschichtiger CSS-Gradient + Filmkorn +
  Horizont-Silhouette, KEIN echtes Foto — dafür gibt's keine Bildquelle),
  helles Editorial-Layout (warmes Papier-Weiß) mit dunklen Kontrapunkt-Bühnen
  (Pipeline- und Kontakt-Abschnitt), Pill-Buttons. Das ist der gewünschte
  Zielstil — bei Weiterentwicklung diese Richtung beibehalten, nicht zurück
  zum Dashboard-Look.
- Falls Janis ein **echtes Foto** liefert (von sich, seinem Büro, der
  Region), soll das den generativen Himmel im Hero ersetzen — das war als
  offener Punkt markiert.

## Technischer Stand

Vite + React, Vercel-Serverless-Functions unter `/api`, Supabase/Postgres
als DB (Region EU/Frankfurt vorgesehen). Struktur:

```
src/
  main.jsx        Bootstrap, selbst gehostete Fonts (DSGVO)
  App.jsx         Hash-Routing: / #intern #impressum #datenschutz
  styles.css      Komplettes Design-System v6 (Tokens in :root)
  content.js      ALLE Texte zentral
  sections.jsx    Nav, Hero+Betriebsmonitor, Trust, Systeme, Pipeline,
                  ROI-Rechner, Ablauf, Preise, FAQ, Kontakt, Footer
  chat.jsx        NEXA-Chat (Vollbild mobil, Eskalations-Formular)
  dashboard.jsx   Internes Dashboard (#intern)
  legal.jsx       Impressum + Datenschutz (Platzhalter, s.u.)
api/
  chat.js         Anthropic-Proxy, Key nur serverseitig, Rate-Limit
  inquiries.js    Anfragen: POST öffentlich (Honeypot), GET/PATCH/DELETE Admin
  _lib.js         Admin-Check (zeitkonstant), Rate-Limit, Supabase-REST
nexagent.jsx      Single-File-Artifact-Version (für Claude-App-Vorschau,
                  Chat/Formular/Dashboard laufen dort über localStorage
                  statt echtem Backend — nur zum Anschauen/Testen gedacht)
```

Alles lokal gebaut und im Playwright-Browser getestet (Desktop 1440px,
Mobile 375px) — Build läuft fehlerfrei, keine Konsolenfehler.

**Fehlt noch im Repo:** der `skills/ui-ux-pro-max`-Ordner (Design-Intelligence-
Skill, wurde in einer anderen Session/anderem Repo hochgeladen, aber noch
nicht hierher migriert — nicht kritisch für den Betrieb der Seite, nur
nützlich für weiteren Design-Feinschliff).

## Offene Aufgaben

**Pflicht vor Livegang:**
1. Platzhalter in `src/legal.jsx` (Impressum/Datenschutz) mit echten Angaben
   von Janis füllen — rechtlich zwingend in Deutschland.
2. Supabase-Projekt anlegen (SQL-Statement steht in `SETUP.md`), Tabelle
   `inquiries` erstellen.
3. Vercel-Deployment: `vercel login` + `vercel --prod`, danach
   Umgebungsvariablen setzen (`ANTHROPIC_API_KEY`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_KEY`, `ADMIN_CODE`), erneut deployen.
4. Anthropic-Ausgabenlimit setzen (Schutz vor Chat-Spam-Kosten).

**Bekannte Umgebungs-Einschränkung:** Frühere Sessions in dieser
Sandbox-Umgebung hatten nur Netzwerkzugriff auf eine kleine Allowlist
(GitHub, npm, Anthropic) — Vercel- und andere Deploy-Befehle schlugen mit
"fetch failed" / 403 fehl. Falls das hier auch auftritt: Janis muss den
eigentlichen Deploy-Befehl (`vercel --prod`) von seinem eigenen Rechner aus
ausführen, oder die Netzwerk-Policy dieser Umgebung anpassen.

## Ton gegenüber Janis

Locker, ehrlich, auf Deutsch. Er ist technisch interessiert, aber kein
Vollzeit-Entwickler — Terminal-Befehle einzeln geben, nicht mehrere auf
einmal. Er arbeitet oft vom Handy aus (GitHub-Web-Uploads statt direktem
Git-Zugriff waren nötig, weil `add_repo` in einer früheren Session nicht
funktionierte). Nicht schönfärben, konkret und direkt sein.
