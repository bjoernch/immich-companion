# Chrome Web Store — Listing Copy

Paste these into the relevant fields of the Web Store dashboard. Everything below is ready to copy verbatim.

---

## Item name

```
Immich Companion
```

## Short description (132 chars max — appears in search results)

```
Save, share and search your self-hosted Immich library from any browser tab. Upload, smart-search, and a memory new tab.
```
(120 chars — leaves headroom)

## Category

`Productivity` (primary). Alternative: `Photos`.

## Language

English (en). Add German if you also localize the listing — the extension UI itself is currently English-only.

---

## Detailed description (English)

Paste verbatim into the Web Store dashboard's "Detailed description" field. Plain text with blank-line paragraph breaks — the Store does not render Markdown. ~4 700 chars; 16 384 char limit.

```
Immich Companion is the missing browser extension for your self-hosted Immich photo library. It lets you save anything you find on the web straight to your library with one click, search your photos from anywhere in the browser, and turn every new tab into a quiet feed of your own memories.

It is built for people who already run Immich at home or on their own server. There is no cloud component, no account to create, no telemetry. The extension talks to one place and one place only: the Immich server URL you enter on first run.

WHAT YOU CAN DO

• Right-click any image or video on any webpage to upload it to your Immich library. The extension fetches the asset, sends it to your server, and shows an in-page toast when it is done — green for success, blue for "already in your library", red on failure with the actual error message. Optionally, every saved item is added to a default album you pick once in settings.

• "Save & share" — same as Save, plus the extension creates a public Immich share link for the asset and copies it to your clipboard. One right-click, paste anywhere, done.

• Smart search from the toolbar icon. The popup has three tabs:
  – Search: a masonry grid of CLIP-powered results. Try natural-language queries like "dog at the beach", "red sunset", or "kitchen at night".
  – Recent: your last thirty uploads with one-click "Open in Immich" and "Copy link" buttons.
  – Upload: a drag-and-drop area plus a file picker for uploading files straight from your computer.

• Smart search from the address bar. Type "im" followed by a space and a query for live suggestions in the omnibox. Press Enter to open the full search results on your Immich.

• Inline matches on Google. When you do a Google search, photos in your library that match the query show up in a small card at the top of the results page, with thumbnails you can click to open in Immich. The search runs directly between your browser and your Immich server — Google's network is not involved at any point. Toggleable in settings; off means zero requests on Google pages.

• A new tab page that opens to a random photo from your library, with an optional "On this day" strip of memories from past years along the bottom. Choose a specific album as the source, set an auto-rotate interval, or turn the override off entirely. When the override is off, the new tab shows a minimal page with a clock and a Google search bar (Chrome does not allow extensions to give back the original new tab without uninstalling — this is the closest a browser extension can do).

• A share-album toolbar that appears on your own Immich /share/... URLs, with Slideshow and Download-all controls.

POLISHED LITTLE THINGS

• Dark theme by default, with light and "match system" options.
• Keyboard shortcut Ctrl+Shift+L (Cmd+Shift+L on Mac) opens the popup. Re-bindable at chrome://extensions/shortcuts.
• A small badge on the toolbar icon turns red when the server is unreachable, so you notice immediately if something is down — checked every five minutes in the background.
• An onboarding tab on first install walks you through creating an API key in Immich and lists the exact scopes the extension needs (asset.upload, asset.read, asset.view, album.read, albumAsset.create, sharedLink.create). Click any scope name to copy it.

PRIVACY

The extension stores your Immich server URL and API key locally in chrome.storage.local. It never sends them anywhere except, in one direction, to the Immich server you configured. There is no backend service, no analytics, no third-party SDK, no tracking. The extension does not read your browsing history, does not contact any other host, and does not collect data of any kind.

The Google integration deserves a specific note. When it is enabled, the extension's content script reads the query from the URL of a Google search page, asks the extension's own background process to query your Immich, and renders the results in an injected card. The HTTP request goes directly from your browser to your Immich server — Google's servers do not see it. The result card lives in Google's page DOM, so theoretically Google's JavaScript could observe a hostname (yours) and the opaque UUIDs of matching assets in link href attributes. Image bytes never appear in Google's page; thumbnails are referenced by in-memory blob URLs only. To eliminate even that theoretical exposure, turn the feature off in settings.

The full privacy policy is linked below.

REQUIREMENTS

• A working Immich server you can sign into and an API key.
• Chrome / Chromium 114 or newer.

OPEN SOURCE

MIT-licensed. Source code on GitHub.
```

---

## Detailed description (German / Deutsch)

Optional — Deutsch als zusätzliche Listing-Sprache hinzufügen. ~5 100 Zeichen.

```
Immich Companion ist die fehlende Browser-Erweiterung für deine selbstgehostete Immich-Foto-Bibliothek. Sie speichert alles, was du im Web findest, mit einem Klick direkt in deine Bibliothek, durchsucht deine Fotos aus jeder Stelle im Browser und macht aus jedem neuen Tab einen ruhigen Feed deiner eigenen Erinnerungen.

Die Erweiterung ist für Menschen gebaut, die Immich bereits zu Hause oder auf einem eigenen Server betreiben. Es gibt keine Cloud-Komponente, kein Konto zum Anlegen, keine Telemetrie. Die Erweiterung spricht mit genau einer Adresse: der Immich-Server-URL, die du beim ersten Start einträgst.

WAS DU TUN KANNST

• Rechtsklick auf ein Bild oder Video auf einer beliebigen Webseite, um es in deine Immich-Bibliothek hochzuladen. Die Erweiterung lädt die Datei herunter, sendet sie an deinen Server und zeigt einen kleinen Hinweis im Tab — grün bei Erfolg, blau bei "schon in der Bibliothek", rot mit der genauen Fehlermeldung im Fehlerfall. Optional wird jedes gespeicherte Element automatisch in ein Standard-Album hinzugefügt, das du einmal in den Einstellungen festlegst.

• "Speichern & teilen" — wie Speichern, plus die Erweiterung erstellt einen öffentlichen Immich-Teilungslink und kopiert ihn in die Zwischenablage. Ein Rechtsklick, irgendwo einfügen, fertig.

• Intelligente Suche per Symbolleisten-Icon. Das Popup hat drei Tabs:
  – Suche: ein masonry-Raster mit CLIP-Suchergebnissen. Probiere natürliche Anfragen wie "Hund am Strand", "roter Sonnenuntergang" oder "Küche bei Nacht".
  – Verlauf: deine letzten dreißig Uploads mit "In Immich öffnen"- und "Link kopieren"-Buttons.
  – Hochladen: ein Drag-and-Drop-Bereich plus Dateiauswahl, um Dateien direkt vom Computer hochzuladen.

• Intelligente Suche aus der Adresszeile. Tippe "im" gefolgt von einem Leerzeichen und einer Anfrage, um Live-Vorschläge zu erhalten. Enter öffnet die vollständigen Ergebnisse auf deinem Immich.

• Inline-Treffer in Google. Wenn du etwas googlest, erscheinen passende Fotos aus deiner Bibliothek in einer kleinen Karte oben in den Suchergebnissen, mit klickbaren Vorschaubildern. Die Suche läuft direkt zwischen deinem Browser und deinem Immich-Server — Googles Netzwerk ist zu keinem Zeitpunkt beteiligt. In den Einstellungen abschaltbar; aus heißt null Anfragen auf Google-Seiten.

• Eine neue-Tab-Seite mit einem zufälligen Foto aus deiner Bibliothek als Hintergrund und optional einem "An diesem Tag"-Streifen mit Erinnerungen aus vergangenen Jahren am unteren Rand. Wähle ein bestimmtes Album als Quelle, lege ein Auto-Wechsel-Intervall fest oder schalte die Übernahme komplett aus. Bei abgeschalteter Übernahme zeigt der neue Tab eine minimale Seite mit Uhrzeit und Google-Suchleiste (Chrome erlaubt Erweiterungen nicht, die ursprüngliche neue Tab-Seite zurückzugeben, ohne dass du die Erweiterung deinstallierst — das ist das Beste, was eine Browser-Erweiterung tun kann).

• Eine Teilungs-Album-Werkzeugleiste, die auf deinen eigenen Immich-/share/-URLs erscheint, mit Diashow- und Alle-herunterladen-Buttons.

KLEINE FEINHEITEN

• Dunkles Design standardmäßig, mit hellem und "Systemeinstellung folgen" als Alternativen.
• Tastenkürzel Strg+Umschalt+L (Cmd+Umschalt+L auf dem Mac) öffnet das Popup. Unter chrome://extensions/shortcuts neu zuweisbar.
• Ein kleiner Indikator auf dem Symbolleisten-Icon wird rot, wenn der Server nicht erreichbar ist — alle fünf Minuten im Hintergrund geprüft.
• Eine Willkommensseite beim ersten Start führt dich durch die Erstellung eines API-Schlüssels in Immich und listet die exakten Berechtigungen, die die Erweiterung benötigt (asset.upload, asset.read, asset.view, album.read, albumAsset.create, sharedLink.create). Klick auf einen Scope-Namen kopiert ihn.

DATENSCHUTZ

Die Erweiterung speichert deine Immich-Server-URL und deinen API-Schlüssel lokal in chrome.storage.local. Sie sendet sie nirgendwo hin, außer — in eine Richtung — an den Immich-Server, den du konfiguriert hast. Es gibt keinen Backend-Dienst, keine Analyse, keine Drittanbieter-SDKs, kein Tracking. Die Erweiterung liest deinen Browserverlauf nicht, kontaktiert keine anderen Hosts und sammelt keinerlei Daten.

Die Google-Integration verdient eine spezifische Anmerkung. Wenn sie aktiviert ist, liest das Content-Skript der Erweiterung die Anfrage aus der URL einer Google-Suchseite, lässt den Hintergrund-Prozess der Erweiterung deine Immich abfragen und rendert die Ergebnisse in einer eingefügten Karte. Die HTTP-Anfrage geht direkt von deinem Browser an deinen Immich-Server — Googles Server sehen sie nicht. Die Ergebnis-Karte lebt im DOM der Google-Seite, also könnte Googles JavaScript theoretisch deinen Server-Hostnamen und die opaken UUIDs passender Assets in href-Attributen beobachten. Bild-Bytes erscheinen niemals auf der Google-Seite; Vorschaubilder werden nur über In-Memory-blob-URLs referenziert. Um auch diese theoretische Exposition auszuschließen, schalte die Funktion in den Einstellungen aus.

Die vollständige Datenschutzerklärung ist unten verlinkt.

VORAUSSETZUNGEN

• Ein laufender Immich-Server, bei dem du dich anmelden kannst, und ein API-Schlüssel.
• Chrome / Chromium 114 oder neuer.

OPEN SOURCE

MIT-Lizenz. Quellcode auf GitHub.
```

---

## Single purpose statement

```
Companion for self-hosted Immich servers — save, search and share photos and videos.
```

---

## Justification — "Wozu dient der Artikel und warum sollten Nutzer ihn installieren?"

Field in the Store dashboard that asks for a short purpose statement and an install pitch. Two short paragraphs, ~ 400 chars each.

### English

```
Immich Companion connects your browser to your self-hosted Immich server. Save images and videos from any webpage with one right-click, search your library straight from the address bar or directly inside Google's search results, and turn every new tab into a feed of your own memories.

Install it if you already run Immich and want to stop downloading-then-uploading every time you find something worth keeping. The extension never talks to anything other than the server you configure — no cloud account, no telemetry, no tracking.
```

### Deutsch

```
Immich Companion verbindet deinen Browser mit deinem selbstgehosteten Immich-Server. Speichere Bilder und Videos von jeder Webseite per Rechtsklick, durchsuche deine Bibliothek direkt aus der Adresszeile oder mitten in den Google-Suchergebnissen und mach jeden neuen Tab zu einem Feed deiner eigenen Erinnerungen.

Installiere die Erweiterung, wenn du Immich bereits selbst betreibst und nicht mehr jedes Mal etwas herunter- und wieder hochladen willst, was du im Web findest. Die Erweiterung kommuniziert ausschließlich mit dem Server, den du konfigurierst — kein Cloud-Konto, keine Telemetrie, kein Tracking.
```

---

## Permission justifications

Paste each one into the corresponding field in the dashboard (the dashboard prompts per permission).

### `host_permissions: <all_urls>`

```
Required for two purposes: (1) when the user right-clicks an image or video on any website and chooses "Save to Immich", the extension fetches that asset's URL and uploads it to the user's configured Immich server; (2) the optional "Show Immich matches on Google" feature injects a result card on google.<tld>/search pages with photos from the user's library that match their query. The host permission is the only way to either fetch arbitrary image URLs or run a content script on user-chosen pages.
```

### `contextMenus`

```
Adds "Save image to Immich", "Save image to Immich & copy share link", "Save video to Immich", and "Save video to Immich & copy share link" to the right-click menu when the user clicks on an image or video.
```

### `storage`

```
Stores the user's Immich server URL, API key, feature toggles, theme preference, and the most recent 30 uploads (filename, asset id, share link if any) locally in chrome.storage.local. No remote storage, no sync.
```

### `notifications`

```
Shows a desktop notification when an upload to Immich completes (or fails). Can be disabled in extension settings.
```

### `activeTab`, `scripting`

```
Used to render in-page upload progress toasts on the source tab when the user saves an asset, and to write the share link to the clipboard when "Save & share" is used (clipboard access requires running in the active tab's context).
```

### `alarms`

```
Schedules a periodic (every 5 minutes) connection check to the user's Immich server, so the toolbar icon can show whether the server is currently reachable.
```

### `clipboardWrite`

```
Writes the public Immich share link to the user's clipboard after a "Save & share" action so it can be pasted into other apps.
```

---

## Privacy policy URL

The Web Store requires a publicly reachable URL. The repo is private, so a few options:

1. **Public gist (recommended)** — fastest. Run from the repo root:

   ```
   gh gist create --public --filename PRIVACY.md --desc "Privacy policy — Immich Companion (Chrome extension)" PRIVACY.md
   ```

   The command prints a URL like `https://gist.github.com/bjoernch/<id>`. Paste it into the Web Store dashboard's "Privacy policy URL" field.

2. **Make the repo public** — simplest if you don't mind the source being open. Use:

   ```
   gh repo edit --visibility public --accept-visibility-change-consequences
   ```

   Then the URL is `https://github.com/bjoernch/immich-companion/blob/main/PRIVACY.md`.

3. **GitHub Pages on a separate public repo** — host PRIVACY.md from a public repo of your choosing.

---

## Screenshots

Capture **at least one**, ideally three or four, at exactly 1280 × 800. The Web Store accepts up to five.

Suggestions:
1. Toolbar popup with search results loaded.
2. Options page on the Connection or New Tab section.
3. The new tab itself with a real photo background and the "On this day" strip populated.
4. A real Google search showing the injected Immich card.
5. The right-click "Save to Immich" menu open over an image, with the success toast.

Save them as `.png` into `webstore-assets/`. The included `screenshot-template-1280x800.png` is just a placeholder.

---

## Promotional images

Already generated by `webstore-assets/make_assets.py`:

- `webstore-assets/promo-tile-440x280.png` — the small tile, required.
- `webstore-assets/promo-marquee-1400x560.png` — the marquee tile, optional.

---

## Build the submission zip

From the repo root:

```
./build.sh
```

That writes `dist/immich-companion-<version>.zip` containing only the runtime files (manifest, JS, CSS, HTML, icon PNGs, LICENSE). Excluded: `.git`, dev files, README/PRIVACY/STORE_LISTING markdown, the `webstore-assets/` folder, Python source, and any `.DS_Store` / `__pycache__` cruft.

Upload that zip on the Web Store dashboard.
