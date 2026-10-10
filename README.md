# Minecraft-Server Setup-Seite

Minimalistische Info-Seite für deine Spieler: Setup-Anleitung, Mods (notwendig / erlaubt / verboten),
Plugins, Downloads und Links, Countdown bis zum Serverende und kleine News-Beiträge.

**Alle Inhalte stehen in Textdateien im Ordner `config/`.** Du musst nie HTML anfassen.
Datei speichern, Seite neu laden (F5) – fertig.

## Welche Datei ist wofür?

| Datei | Inhalt |
|---|---|
| `config/server.txt` | Name, IP, Version, **Enddatum**, Akzentfarbe, Reihenfolge der Abschnitte, Fußzeile |
| `config/setup.txt` | Nummerierte Schritt-für-Schritt-Anleitung |
| `config/mods.txt` | Mods in Gruppen: Notwendig / Erlaubt / Verboten |
| `config/plugins.txt` | Plugins, die auf dem Server laufen |
| `config/links.txt` | Download- und Community-Links als Kacheln |
| `config/news.txt` | Kleine Blog-Beiträge (neueste oben) |

Ganz oben in jeder Datei steht als Kommentar, wie sie aufgebaut ist.

## Die wichtigsten Handgriffe

- **Server-Laufzeit ändern:** in `server.txt` die Zeile `ende = 2026-12-31 23:59` anpassen.
- **Mod hinzufügen:** in `mods.txt` unter die passende Gruppe eine Zeile schreiben:
  `Name | Beschreibung | Download-Link`
- **Abschnitt ausblenden:** in `server.txt` bei `reihenfolge` den Namen streichen
  (oder die zugehörige Datei löschen).
- **Neuer Beitrag:** in `news.txt` oben einfügen:
  `## Titel | 2026-10-12 | Update`, darunter der Text.
- **Farbe ändern:** `akzentfarbe = #7cf5b0` in `server.txt`.

Im Text funktionieren `**fett**`, `` `code` `` und `[Linktext](https://…)`.
Das Zeichen `|` trennt Spalten und darf deshalb nicht im Text vorkommen.
Zeilen, die mit `#` beginnen, sind Kommentare.

## Lokal ansehen

Die Seite lädt die Textdateien nach. Das klappt nicht per Doppelklick auf `index.html`,
sondern nur über einen Webserver:

- Windows: `start.bat` doppelklicken (nutzt PowerShell, es muss nichts installiert werden;
  `server.ps1` muss im selben Ordner liegen)
- Mac/Linux: `./start.sh` (benötigt Python 3)

Dann öffnet sich `http://localhost:8080` (bei belegtem Port der nächste freie bis 8090).
Beenden mit Strg+C oder durch Schließen des Fensters.

## Veröffentlichen auf GitHub Pages

1. Auf github.com ein neues **öffentliches** Repository anlegen (z. B. `wintercraft`).
2. Im leeren Repository auf **uploading an existing file** klicken und den **Inhalt** des
   entpackten Ordners hineinziehen (nicht das ZIP). `index.html` muss direkt im Hauptverzeichnis
   des Repositories liegen. Danach **Commit changes**.
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   Branch `main`, Ordner `/ (root)`, dann **Save**.
4. Nach ein bis zwei Minuten ist die Seite erreichbar unter
   `https://DEIN-NAME.github.io/REPO-NAME/`.

**Später ändern:** Im Repository die Datei in `config/` öffnen, auf das Stift-Symbol klicken,
Text ändern und **Commit changes**. Nach ein bis zwei Minuten ist die Änderung live
(ggf. mit Strg+F5 neu laden).

Hinweis: Mit einem kostenlosen GitHub-Konto muss das Repository öffentlich sein.
Alle Inhalte der Seite und der Textdateien sind damit für jeden einsehbar.

## Eigene Dateien anbieten

Lege z. B. ein Resource Pack in einen Ordner `downloads/` neben `index.html` und verlinke es
in `links.txt` mit `Resource Pack | downloads/resourcepack.zip | 12 MB`.

## Hinweise

- Noch Platzhalter, bitte vor dem Veröffentlichen ersetzen: Server-IP, Minecraft-Version, Enddatum,
  Mods, Setup-Schritte, Links (Discord, Karte, Regeln) und die News-Beiträge.
- Zeiten werden in der Zeitzone aus `server.txt` (Standard: `Europe/Berlin`) berechnet, inklusive
  Sommer-/Winterzeit, unabhängig von der Uhr des Besuchers.
- Die Seite folgt automatisch dem Hell-/Dunkelmodus des Geräts.
