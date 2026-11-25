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
- Hinweise bei: weniger als zwei kleinen Nachweisen pro Halbjahr oder fehlender mündlicher Note (§ 19 Abs. 6), falscher Anzahl Schulaufgaben (§ 18 Abs. 1), mehreren angekündigten Nachweisen an einem Tag, mehr als drei pro Woche oder einer Stegreifaufgabe am Schulaufgabentag (§ 17 Abs. 3), Schulaufgaben ohne doppeltes Gewicht (§ 23 Abs. 2), offenen Nachterminen und fehlenden Zeugnisnoten.

## Entwicklung

```bash
npm run dev     # Entwicklungsserver (ohne strenge CSP)
npm test        # Unit-Tests: Kryptografie, Notenlogik, RSO-Regeln, Import
npm run check   # Typprüfung
npm run build   # Produktions-Build nach dist/
```

Technik: Vite, Svelte 5, TypeScript, Tailwind CSS 4. Keine Laufzeit-Abhängigkeiten außer Svelte.

Der frühere Stand (Tauri-Desktop-App) ist im Git-Tag `legacy-tauri` erhalten.
