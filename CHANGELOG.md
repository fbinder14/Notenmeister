# Änderungen

Neue Versionen spielen Sie mit `npm run update` ein (vorher eine Sicherung exportieren). Danach die App einmal sperren und entsperren.

## Unveröffentlicht

**Behoben**
- **Startseite**: In schmalen Fenstern (z. B. MacBook Air) ragten die Widgets der rechten Spalte über den Fensterrand hinaus, und die Überschrift war links abgeschnitten. Beide Spalten passen sich jetzt der Fensterbreite an; im Zeugnis-Widget werden die Ringe kleiner und die Zähler rutschen bei Bedarf unter den Kursnamen. Bei großer Schrift wird der Knopf „Einblenden“ in verdeckten Widgets nicht mehr abgeschnitten.

## 2.1.0 – 2026-11-27

**Neu**
- **Einrichtungsassistent** beim ersten Start: Fächer, Schuljahr mit Ferien und Zeugnisterminen, Klassen und Schülerlisten, Unterricht, Sicherung. Jederzeit erneut über Einstellungen › Unterricht › Einrichtungsassistent.
- **Sport**: Fächer „Sport (Jungen)“ / „Sport (Mädchen)“ mit eigenen Leistungsnachweisarten, Messwerten (mehrere Versuche), ISB-Orientierungstabellen 2023, Leistungsfortschritt, Status „befreit“; keine Schulaufgaben, kein Vorrückungsfach.
- **Startseite**: Zeugnis-Widget zeigt fehlende Noten; Widgets lassen sich einklappen.
- **Autostart unter macOS**: `npm run autostart:install` startet den Server bei jeder Anmeldung.
- **Aktualisieren** mit `npm run update`; die Versionsnummer steht unten in den Einstellungen.
- **Handbuch für Referendarinnen und Referendare** (`docs/Anleitung-Referendare.pdf`).

**Hinweis zu den Daten**
- Bestehende Datenstände werden beim Entsperren automatisch ergänzt (z. B. Sport-Arten). Vorher eine Sicherung exportieren.

## 2.0.0 – 2026-11-15

- Neufassung als installierbare Web-App für Chrome: verschlüsselt (AES-256-GCM), ohne Netzwerkverbindungen, Notenlogik nach RSO (Fassung ab 01.08.2026).
