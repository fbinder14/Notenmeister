#!/bin/bash
# Notenmeister-Server unter macOS automatisch starten (launchd).
#
#   npm run autostart:install     einrichten bzw. aktualisieren
#   npm run autostart:uninstall   wieder entfernen
#   npm run autostart:status      prüfen, ob der Server läuft
#
# Der Server startet bei jeder Anmeldung, baut die App neu (npm start) und
# wird neu gestartet, falls er abstürzt. Adresse: http://127.0.0.1:4317
set -euo pipefail

LABEL="local.notenmeister.server"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/Notenmeister.log"
URL="http://127.0.0.1:4317/"
DOMAIN="gui/$(id -u)"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "Dieses Skript ist nur für macOS. Unter Windows/Linux den Server mit 'npm start' starten" >&2
  echo "oder ihn über die Aufgabenplanung bzw. systemd beim Anmelden starten lassen." >&2
  exit 1
fi

xml() { sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' <<<"$1"; }

stop_agent() {
  launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
}

running() { curl -fs -o /dev/null --max-time 2 "$URL"; }

case "${1:-}" in
  install)
    NPM="$(command -v npm || true)"
    NODE="$(command -v node || true)"
    if [[ -z "$NPM" || -z "$NODE" ]]; then
      echo "Node.js/npm nicht gefunden. Bitte zuerst Node.js installieren (https://nodejs.org)." >&2
      exit 1
    fi

    cd "$REPO"
    [[ -d node_modules ]] || "$NPM" install
    echo "Baue die App einmal zur Probe …"
    "$NPM" run build >/dev/null

    stop_agent
    if running; then
      echo "Port 4317 ist schon belegt (läuft der Server noch in einem Terminal oder in Claude?)." >&2
      echo "Bitte diesen Server zuerst beenden und dann erneut ausführen." >&2
      exit 1
    fi

    mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG")"
    # launchd kennt den PATH der Shell nicht: Ordner von node und npm mitgeben.
    PATHS="$(dirname "$NODE"):$(dirname "$NPM"):/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
    cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(xml "$NPM")</string>
    <string>run</string>
    <string>start</string>
  </array>
  <key>WorkingDirectory</key><string>$(xml "$REPO")</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$(xml "$PATHS")</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$(xml "$LOG")</string>
  <key>StandardErrorPath</key><string>$(xml "$LOG")</string>
</dict>
</plist>
EOF
    launchctl bootstrap "$DOMAIN" "$PLIST"

    for _ in $(seq 1 30); do
      if running; then
        echo "Fertig: Notenmeister läuft unter $URL und startet künftig bei jeder Anmeldung."
        echo "Protokoll: $LOG"
        exit 0
      fi
      sleep 1
    done
    echo "Der Autostart ist eingerichtet, der Server antwortet aber noch nicht. Siehe $LOG" >&2
    exit 1
    ;;

  uninstall)
    stop_agent
    rm -f "$PLIST"
    echo "Autostart entfernt. Der Server läuft nicht mehr; starten lässt er sich weiter mit 'npm start'."
    ;;

  status)
    if launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then echo "Autostart: eingerichtet"; else echo "Autostart: nicht eingerichtet"; fi
    if running; then echo "Server: läuft unter $URL"; else echo "Server: nicht erreichbar"; fi
    ;;

  *)
    echo "Aufruf: $0 install | uninstall | status" >&2
    exit 1
    ;;
esac
