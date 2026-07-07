// Zentrale Inhalte der Website — Texte hier ändern, nicht in den Komponenten.

export const SYSTEMS = [
  {
    title: 'Posteingang & Dokumente',
    desc: 'Rechnungen, Lieferscheine und E-Mails werden automatisch erkannt, ausgelesen und dem richtigen Vorgang zugeordnet. Ihr Team bekommt fertige Ergebnisse statt Papierstapel.',
    tag: 'Rechnung → Buchhaltung',
    icon: 'inbox',
  },
  {
    title: 'Angebote & Vertrieb',
    desc: 'Anfragen werden klassifiziert, Angebotsentwürfe vorbereitet und offene Angebote automatisch nachgefasst — bevor sie in Vergessenheit geraten.',
    tag: 'Anfrage → Angebotsentwurf',
    icon: 'trend',
  },
  {
    title: 'Wissensassistent',
    desc: 'Ein interner Assistent, der Ihre Dokumente, Prozesse und Preislisten kennt. Antwortet in Sekunden — immer mit Quellenangabe, damit Sie nachprüfen können.',
    tag: 'Frage → Antwort mit Quelle',
    icon: 'book',
  },
  {
    title: 'Berichte & Routine',
    desc: 'Wochenreports, Auswertungen und Datenübertrag zwischen Programmen laufen im Hintergrund. Alles, was jede Woche gleich abläuft, läuft ab jetzt von selbst.',
    tag: 'Freitag 17:00 → Wochenreport',
    icon: 'chart',
  },
]

export const FEED_ITEMS = [
  { text: '<b>Rechnung erkannt</b> → an Buchhaltung übergeben', status: 'done' },
  { text: '<b>Angebot #2041</b> seit 6 Tagen offen → Nachfass-Entwurf erstellt', status: 'done' },
  { text: '<b>Lieferschein</b> ausgelesen → Auftrag 5512 zugeordnet', status: 'done' },
  { text: '<b>E-Mail-Anfrage</b> klassifiziert → Vertrieb, Priorität hoch', status: 'done' },
  { text: '<b>Wochenreport</b> wird erstellt …', status: 'working' },
  { text: '<b>Preisanfrage</b> beantwortet → Quelle: Preisliste 2026', status: 'done' },
  { text: '<b>Zahlungseingang</b> abgeglichen → Rechnung 1893 geschlossen', status: 'done' },
  { text: '<b>Reklamation erkannt</b> → zur menschlichen Freigabe vorgelegt', status: 'working' },
]

export const PIPELINE_STEPS = [
  { title: 'Erkennen', desc: 'Eingehende Rechnung wird im Postfach identifiziert.' },
  { title: 'Auslesen', desc: 'Betrag, Lieferant und Positionen werden extrahiert.' },
  { title: 'Prüfen', desc: 'Abgleich mit Bestellung — Unstimmigkeiten gehen an einen Menschen.' },
  { title: 'Übergeben', desc: 'Sauber verbucht an Ihre Buchhaltungssoftware.' },
]

export const PROCESS = [
  { title: 'Analyse', desc: 'Kostenloses Gespräch: Wir finden die Aufgabe mit dem größten Hebel in Ihrem Betrieb.' },
  { title: 'Demo & Festpreis', desc: 'Sie sehen eine Demo mit Ihren echten Beispieldaten — und bekommen einen Festpreis.' },
  { title: 'Pilot in 2–3 Wochen', desc: 'Eine Automatisierung geht produktiv. Sie zahlen erst nach erfolgreicher Abnahme.' },
  { title: 'Betrieb & Ausbau', desc: 'Wir überwachen das System, halten es am Laufen und bauen es Schritt für Schritt aus.' },
]

export const PRICING = [
  {
    name: 'Pilot',
    price: 'ab 1.490 €',
    period: 'einmalig',
    desc: 'Der risikofreie Einstieg: eine Automatisierung, produktiv in 2–3 Wochen.',
    features: [
      'Eine Automatisierung Ihrer Wahl',
      'Produktiv in 2–3 Wochen',
      'Zahlung erst nach Abnahme',
      'Persönliche Einweisung Ihres Teams',
    ],
    cta: 'Pilot anfragen',
    featured: false,
  },
  {
    name: 'KI-System',
    price: 'ab 4.900 € Setup',
    period: '+ 490 €/Monat',
    desc: 'Das laufende System: mehrere Automatisierungen plus Wissensassistent.',
    features: [
      'Mehrere Automatisierungen + Wissensassistent',
      'Monitoring & Support (Reaktion < 24 h)',
      '30 Tage Geld-zurück auf das Setup',
      'Laufende Verbesserungen inklusive',
    ],
    cta: 'Gespräch vereinbaren',
    featured: true,
  },
  {
    name: 'Partner',
    price: 'ab 9.500 € Setup',
    period: '+ ab 990 €/Monat',
    desc: 'KI-Ausbau über mehrere Abteilungen — mit Roadmap und Schulungen.',
    features: [
      'KI-Ausbau über mehrere Abteilungen',
      'Gemeinsame Roadmap & Priorisierung',
      'Schulungen für Ihre Mitarbeiter',
      'Priorisierter Support',
    ],
    cta: 'Partner werden',
    featured: false,
  },
]

export const FAQ = [
  {
    q: 'Muss ich meine Software wechseln?',
    a: 'Nein. NexAgent-Systeme werden an Ihre bestehenden Programme angebunden — E-Mail, Buchhaltung, Warenwirtschaft, Excel. Ihr Team arbeitet weiter wie gewohnt, nur ohne die Routinearbeit.',
  },
  {
    q: 'Warum nicht einfach selbst ein KI-Tool nutzen?',
    a: 'Können Sie — nur liefert ein Tool kein Ergebnis, sondern eine weitere Aufgabe: einrichten, anbinden, pflegen, prüfen. NexAgent liefert das fertige System inklusive Betrieb und Verantwortung. Wenn etwas nicht läuft, ist das unser Problem, nicht Ihres.',
  },
  {
    q: 'Wie sicher sind meine Daten?',
    a: 'Alle Daten liegen auf Servern in der EU (Region Frankfurt), verarbeitet nach DSGVO. Auf Wunsch schließen wir einen Auftragsverarbeitungsvertrag (AVV) ab. Ihre Daten werden nicht zum Training von KI-Modellen verwendet.',
  },
  {
    q: 'Was passiert, wenn die KI einen Fehler macht?',
    a: 'Kritische Schritte laufen nie vollautomatisch: Bevor etwas verbucht, versendet oder gelöscht wird, prüft ein Mensch die Freigabe. Zusätzlich wird jedes System überwacht — Unstimmigkeiten werden gemeldet statt still durchgewunken.',
  },
  {
    q: 'Ab welcher Unternehmensgröße lohnt sich das?',
    a: 'Ab etwa 10 Mitarbeitern gibt es fast immer genug wiederkehrende Büroarbeit, damit sich ein Pilot innerhalb weniger Monate rechnet. Der ROI-Rechner oben gibt Ihnen eine ehrliche erste Schätzung — oder Sie fragen die kostenlose Machbarkeits-Demo an.',
  },
]

export const NAV_LINKS = [
  { label: 'Systeme', href: '#systeme' },
  { label: 'Ablauf', href: '#ablauf' },
  { label: 'Preise', href: '#preise' },
]

export const TRUST_ITEMS = [
  { icon: 'shield', text: '<b>0 € Risiko</b> im Piloten — Zahlung erst nach Abnahme' },
  { icon: 'eu', text: '<b>EU-Hosting</b> · DSGVO-konform · AVV auf Wunsch' },
  { icon: 'clock', text: '<b>Reaktion &lt; 24 h</b> im laufenden Betrieb' },
]
