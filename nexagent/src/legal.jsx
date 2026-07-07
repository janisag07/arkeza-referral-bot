// Impressum & Datenschutzerklärung.
// WICHTIG: Die mit <Ph> markierten Stellen MÜSSEN vor dem Livegang mit den
// echten Angaben von Janis befüllt werden — ohne vollständiges Impressum
// darf die Seite in Deutschland nicht öffentlich beworben werden.

function Ph({ children }) {
  return <span className="placeholder">[{children}]</span>
}

function Back() {
  return <a className="legal-back" href="#">← Zurück zur Website</a>
}

export function Impressum() {
  return (
    <div className="legal">
      <Back />
      <h1>Impressum</h1>

      <h2>Angaben gemäß § 5 TMG / § 18 MStV</h2>
      <p>
        NexAgent<br />
        Inhaber: <Ph>Vollständiger Name</Ph><br />
        <Ph>Straße und Hausnummer</Ph><br />
        <Ph>PLZ Ort</Ph>
      </p>

      <h2>Kontakt</h2>
      <p>
        Telefon: <Ph>Telefonnummer</Ph><br />
        E-Mail: <Ph>E-Mail-Adresse</Ph>
      </p>

      <h2>Umsatzsteuer</h2>
      <p>
        Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: <Ph>USt-IdNr., falls vorhanden — sonst Absatz entfernen</Ph>
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        <Ph>Vollständiger Name</Ph>, Anschrift wie oben.
      </p>

      <h2>EU-Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </div>
  )
}

export function Datenschutz() {
  return (
    <div className="legal">
      <Back />
      <h1>Datenschutzerklärung</h1>

      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlich für die Datenverarbeitung auf dieser Website:<br />
        <Ph>Vollständiger Name</Ph>, <Ph>Anschrift</Ph>, E-Mail: <Ph>E-Mail-Adresse</Ph>
      </p>

      <h2>2. Hosting</h2>
      <p>
        Diese Website wird bei Vercel Inc. gehostet. Beim Aufruf der Seite verarbeitet Vercel
        technisch notwendige Daten (z. B. IP-Adresse, Zeitpunkt des Zugriffs) zur Auslieferung
        der Inhalte. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
        einem sicheren und effizienten Betrieb). Mit Vercel besteht ein
        Auftragsverarbeitungsvertrag inkl. EU-Standardvertragsklauseln.
      </p>

      <h2>3. Schriftarten</h2>
      <p>
        Alle Schriftarten werden lokal auf unserem Server gehostet. Es findet keine Verbindung
        zu Google Fonts oder anderen externen Schriftdiensten statt.
      </p>

      <h2>4. Kontaktformular</h2>
      <p>
        Wenn Sie uns über das Kontaktformular eine Anfrage senden, speichern wir die von Ihnen
        angegebenen Daten (Name, Firma, E-Mail, Telefon, Nachricht) zur Bearbeitung der Anfrage
        und für Anschlussfragen. Die Daten werden in einer Datenbank bei Supabase (Region
        EU/Frankfurt) gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche
        Maßnahmen). Wir löschen die Daten, sobald die Bearbeitung abgeschlossen ist und keine
        gesetzlichen Aufbewahrungspflichten entgegenstehen.
      </p>

      <h2>5. Chat-Assistent (NEXA)</h2>
      <p>
        Auf der Website steht ein KI-Chat-Assistent zur Verfügung. Ihre Chat-Nachrichten werden
        zur Beantwortung an die Anthropic-API (Anthropic PBC, USA) übermittelt; es gelten
        EU-Standardvertragsklauseln. Bitte geben Sie im Chat keine sensiblen personenbezogenen
        Daten ein. Chat-Verläufe werden nur dann bei uns gespeichert, wenn Sie aktiv eine
        Kontaktanfrage aus dem Chat heraus absenden. Rechtsgrundlage: Art. 6 Abs. 1 lit. f
        DSGVO (Bereitstellung einer komfortablen Erstauskunft) bzw. lit. b bei Kontaktanfragen.
      </p>

      <h2>6. Cookies & Tracking</h2>
      <p>
        Diese Website verwendet keine Tracking-Cookies und keine Analyse-Tools. Es wird
        lediglich technisch notwendiger lokaler Speicher verwendet (z. B. für den internen
        Betriebszugang), der keine Profilbildung ermöglicht.
      </p>

      <h2>7. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung
        (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20)
        sowie Widerspruch (Art. 21). Außerdem haben Sie das Recht, sich bei einer
        Datenschutz-Aufsichtsbehörde zu beschweren — zuständig für Bayern: Bayerisches
        Landesamt für Datenschutzaufsicht (BayLDA), Ansbach.
      </p>

      <h2>8. Auftragsverarbeitung</h2>
      <p>
        Für Kundenprojekte schließen wir auf Wunsch einen Auftragsverarbeitungsvertrag (AVV)
        gemäß Art. 28 DSGVO ab.
      </p>
    </div>
  )
}
