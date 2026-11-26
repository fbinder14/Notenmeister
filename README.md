# Notenmeister

Lokale Notenverwaltung für Lehrkräfte an bayerischen Realschulen. Läuft als installierbare Web-App in Chrome. Alle Daten bleiben verschlüsselt auf dem eigenen Rechner.

## Starten

```bash
npm install
npm start
```

Danach `http://127.0.0.1:4317` in Chrome öffnen und über das Installieren-Symbol in der Adressleiste als App installieren. Nach dem ersten Laden startet die App auch ohne laufenden Server.

Die Adresse (inklusive Port 4317) bitte beibehalten: Der Browser ordnet die gespeicherten Daten genau dieser Adresse zu.

### Server automatisch starten (macOS, empfohlen)

`npm start` läuft nur, solange das Terminal offen ist. Damit die App auch am nächsten Tag und nach einem Neustart unter derselben Adresse erreichbar ist, den Server einmalig als Autostart einrichten:

```bash
npm run autostart:install
```

Der Server startet dann bei jeder Anmeldung, baut die App dabei neu (Änderungen nach `git pull` sind also automatisch drin) und wird neu gestartet, falls er abstürzt. Protokoll: `~/Library/Logs/Notenmeister.log`.

```bash
npm run autostart:status      # läuft der Server?
npm run autostart:uninstall   # Autostart wieder entfernen
```

Wird der Repo-Ordner verschoben, `npm run autostart:install` im neuen Ordner erneut ausführen. Unter Windows oder Linux den Server über die Aufgabenplanung bzw. systemd beim Anmelden mit `npm start` starten lassen.

**Wichtig:** Immer genau `http://127.0.0.1:4317` verwenden. `localhost:4317` ist für den Browser eine andere Seite – dort erscheint die App leer, weil die Daten unter `127.0.0.1` gespeichert sind.

## Erster Start

Nach dem Festlegen des Master-Passworts führt ein Einrichtungsassistent in wenigen Minuten durch:

1. **Fächer**, für die du die Lehrbefähigung hast.
2. **Schuljahr und Termine**: vorbelegt nach der bayerischen Ferienordnung (BayMBl. 2022 Nr. 747, Schuljahre 2026/27 bis 2029/30) mit Zwischen- und Jahreszeugnis, Ferien und den Terminen der Abschlussprüfung. Der Notenschluss ist ein Vorschlag (zwei Wochen vor dem Zeugnis) und sollte mit dem Terminplan der Schule abgeglichen werden.
3. **Klassen und Schülerlisten**: mehrere Klassen auf einmal („7a, 8b, 9c“), Namen per Einfügen, CSV-/Excel-Datei, einzeln oder später. Auf Wunsch eine Beispielklasse mit erfundenen Namen zum Ausprobieren.
4. **Unterricht**: welches Fach in welcher Klasse, mit Wochenstunden und Schulaufgaben nach Stundentafel und RSO § 18.
5. **Sicherung**: Sicherungsordner wählen oder eine Sicherungsdatei herunterladen.

Jeder Schritt speichert sofort und lässt sich überspringen; nach dem Sperren geht es an derselben Stelle weiter. Danach hilft die Karte „Erste Schritte“ auf der Startseite. Der Assistent lässt sich in den Einstellungen (Unterricht › Einrichtungsassistent) jederzeit erneut öffnen. Wer aus einer Sicherung wiederherstellt, überspringt ihn.

## Datenschutz und Sicherheit

- **Verschlüsselung:** AES-256-GCM über die im Browser eingebaute WebCrypto-API. Der Datenschlüssel wird mit einem aus dem Master-Passwort abgeleiteten Schlüssel verpackt (PBKDF2-HMAC-SHA-256, 600.000 Runden, zufälliges Salt). Schlüssel sind nicht exportierbar und liegen nur im Arbeitsspeicher.
- **Speicher:** IndexedDB, aufgeteilt in verschlüsselte Blöcke (Stammdaten und je Klasse). Namen und Noten stehen nirgends im Klartext.
- **Keine Netzwerkverbindungen:** Content-Security-Policy mit `connect-src 'none'`, keine fremden Skripte, Schriften oder Telemetrie.
- **Sicherung:** Export als verschlüsselte Datei `*.notenmeister`. In Chrome zusätzlich automatische Sicherung in einen gewählten Ordner (die letzten 10 Stände).
- **Sperre:** automatisch nach einstellbarer Zeit ohne Eingabe, manuell mit ⌘L.
- **Passwort vergessen:** Die Daten lassen sich dann nicht wiederherstellen. Das ist bei echter Verschlüsselung unvermeidlich.
- Ausdrucke und PDF-Dateien sind nicht verschlüsselt.

## Notenlogik nach RSO

Fassung der Realschulordnung gültig ab 01.08.2026.

| Leistungsnachweis | Kategorie | Standardgewicht |
|---|---|---|
| Schulaufgabe, angesagter Test (§ 18 Abs. 3), Ersatz für Schulaufgabe | groß | 2 |
| Kurzarbeit, Stegreifaufgabe, fachlicher Leistungstest, gleichwertiges Prüfungsformat | klein | 1 |
| Rechenschaftsablage, Referat, Unterrichtsbeitrag | klein, mündlich | 1 |
| Praktischer Leistungsnachweis | klein, praktisch | 1 |

- Jahresfortgangsnote als gewichteter Schnitt (§ 23); große und kleine Nachweise werden zusätzlich getrennt ausgewiesen.
- Die Zeugnisnote setzt die Lehrkraft; die App macht nur einen Vorschlag.
- Status je Note: gewertet, Nachtermin offen (§ 22), Note 6 bei unentschuldigtem Versäumnis oder Verweigerung (§ 21 Abs. 4) oder Unterschleif (§ 21 Abs. 2), nicht gewertet.
- Hinweise bei: weniger als zwei kleinen Nachweisen pro Halbjahr oder fehlender mündlicher Note (§ 19 Abs. 6), falscher Anzahl Schulaufgaben (§ 18 Abs. 1), mehreren angekündigten Nachweisen an einem Tag, mehr als drei pro Woche oder einer Stegreifaufgabe am Schulaufgabentag (§ 17 Abs. 3), Schulaufgaben ohne doppeltes Gewicht (§ 23 Abs. 2), offenen Nachterminen und fehlenden Zeugnisnoten vor dem Notenschluss. Bei der Terminplanung zusätzlich Hinweise auf Ferien, Wochenenden, Termine nach dem Notenschluss und – für 10. Klassen – den Zeitraum der Abschlussprüfung.

## Sport

Ist ein Fach als Sport erkannt (Name beginnt mit „Sport“, z. B. „Sport (Jungen)“ oder „Sport (Mädchen)“), gilt ein eigenes Profil:

- **Keine Schulaufgaben, kein Vorrückungsfach** (RSO § 18 Abs. 1, § 25 Abs. 1; abwählbar). Je Halbjahr mindestens zwei praktische Leistungsnachweise (§ 19 Abs. 5, 6); Hinweis, wenn sie nur aus einem Handlungsfeld stammen (ISB-Empfehlung 2023).
- **Eigene Arten**, nur in Sportkursen: sportpraktischer Leistungsnachweis (vorausgewählt), Einsatz/Fairness/Kooperation, Kenntnisse/Demonstration mit Erläuterung. Schriftliche Arten werden dort nicht angeboten. Ältere Datenstände erhalten die Arten beim Entsperren automatisch.
- **Wertungstabelle je Fach** (Jungen/Mädchen), wählbar im Einrichtungsassistenten oder unter „Unterricht bearbeiten“.
- **Bewertung eines Nachweises** nach Vorlage, frei anpassbar: Messwert (Zeit, Weite, Höhe, Anzahl; mehrere Versuche, der beste zählt), Technik + Leistung, Leistungsfortschritt oder Teilnoten nach Kriterien. Die Note wird aus den gewichteten Teilen berechnet (Rundung wie beim Zeugnisvorschlag).
- **Grenzwerte** aus den ISB-Orientierungstabellen 2023 (Leichtathletik und Schwimmen, Jgst. 5–10, `src/lib/domain/sportTables.ts`). Sie sind unverbindlich, werden beim Anlegen kopiert und lassen sich je Nachweis ändern; die Noten werden dann neu berechnet.
- **Leistungsfortschritt** nach ISB: (Note Eingangstest + Note Ausgangstest + 3 × Verbesserungsnote) / 5, Verbesserung ab 5/4/3/2/1 % → Note 1–5, nie schlechter als die bessere Testnote.
- **Status „befreit“** (Attest): keine Note, kein fehlender Nachweis; in der Zeugnisübersicht der Hinweis auf die Bemerkung statt Note (§ 31 Abs. 6).

Eine Handy-Version für die Erfassung in der Halle ist vorgesehen, aber noch nicht umgesetzt.

## Entwicklung

```bash
npm run dev     # Entwicklungsserver (ohne strenge CSP)
npm test        # Unit-Tests: Kryptografie, Notenlogik, RSO-Regeln, Import
npm run check   # Typprüfung
npm run build   # Produktions-Build nach dist/
```

Technik: Vite, Svelte 5, TypeScript, Tailwind CSS 4. Keine Laufzeit-Abhängigkeiten außer Svelte.

Der frühere Stand (Tauri-Desktop-App) ist im Git-Tag `legacy-tauri` erhalten.
