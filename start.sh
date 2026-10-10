#!/usr/bin/env bash
# Startet einen lokalen Webserver, um die Seite zu testen.
cd "$(dirname "$0")" || exit 1
echo
echo " Seite läuft auf http://localhost:8080  (Beenden mit Strg+C)"
echo
(command -v xdg-open >/dev/null && xdg-open http://localhost:8080) \
  || (command -v open >/dev/null && open http://localhost:8080) \
  || true
python3 -m http.server 8080
