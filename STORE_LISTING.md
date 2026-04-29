# Store listings — Chrome Web Store and Firefox AMO

The same description copy works for both Chrome Web Store (CWS) and Firefox Add-on store (AMO). Where the two stores differ, both variants are noted. Build artifacts come from `./build.sh`:

- `dist/immich-companion-chrome-<version>.zip` — upload to the Chrome Web Store dashboard.
- `dist/immich-companion-firefox-<version>.zip` — upload to the Firefox AMO dashboard.

Both files contain the same code; only the manifest differs slightly (Firefox build strips Chrome-only `minimum_chrome_version`).

---

## Item name

```
Immich Companion
```

## Short description (132 chars max — appears in search results)

```
Save, share and search your self-hosted Immich library from any browser tab. Includes inline video preview and a memory new tab.
```
(128 chars — leaves headroom)

## Category

- **Chrome Web Store**: `Productivity` (primary). Alternative: `Photos`.
- **Firefox AMO**: `Photos, Music & Videos` (primary). Alternative: `Productivity`.

## Language

English (en). Add German if you also localize the listing — the extension UI itself is currently English-only.

## Firefox AMO-specific fields

In addition to the shared description, AMO asks for:

- **"Notes for reviewers"** (private to Mozilla):
  ```
  This extension talks only to a self-hosted Immich server (https://immich.app) that the user enters during onboarding. There is no developer backend, no analytics, no third-party services. To test the extension end-to-end you need an Immich server with API key access. A demo server is at https://demo.immich.app — create a free account, generate an API key under Account Settings → API Keys, and paste both into the extension's onboarding screen.

  No remote code is loaded. All sources match the public GitHub repository at https://github.com/bjoernch/immich-companion (release v<version>).
  ```
- **"Source code submission"**: AMO requires the source for review on extensions that contain minified or transpiled code. This extension ships only hand-written JS/HTML/CSS — no build step beyond zipping the files in build.sh. You can either:
  - Upload `dist/immich-companion-firefox-<version>.zip` as both the listed package AND the source (since they're identical), or
  - Point the reviewer to the corresponding tag on GitHub.

---

## Detailed description (English)

Paste verbatim into the Web Store dashboard's "Detailed description" field. Plain text with blank-line paragraph breaks — the Store does not render Markdown.

```
Right-click any image or video to save it directly to your self-hosted Immich server.

---

Immich Companion is a browser companion for your self-hosted Immich photo library. It lets you save images and videos from any webpage with one right-click, search your photos from anywhere in the browser, and turn every new tab into a feed of your own memories.

It is built for people who already run Immich at home or on their own server. There is no cloud component, no account to create, no telemetry. The extension talks to one place and one place only: the Immich server URL you enter on first run.

SIMPLE AND FAST
- Right-click any image or video and select "Save to Immich" or "Save & share"
- Files are uploaded instantly to your server
- In-page toasts confirm each upload — green on success, blue on duplicate, red with the actual error message on failure
- "Save & share" creates a public Immich share link and copies it to your clipboard in one click

A LIBRARY VIEW THAT FEELS LIKE A PHONE GALLERY
- The toolbar popup opens straight to the most recent items in your library — masonry layout, grouped by month with sticky date headers and a thin year scrubber on the right edge
- Click any year on the scrubber to jump straight to that point in your library
- Filter the view to Photos only or Videos only with a single pill click
- Smart search runs from the same input — up to 250 CLIP results per query, grouped on the same timeline
- Quick actions on every result, revealed on hover: copy to clipboard, copy a public share link, download the original, and open the photo's GPS location in Google Maps or Apple Maps (macOS-only) — each with inline progress, success, and error feedback
- Choose whether the clipboard action copies the medium-size preview (default, fast and always works) or the full-resolution original
- Inline video preview — videos in the gallery get a play overlay and a duration badge; click to play the transcoded stream right inside the popup, or pop it out into a dedicated 960×600 player window with native fullscreen support
- Optional "Show Immich matches on Google" — when enabled, matching photos from your library appear in a card above Google search results; the search runs entirely between your browser and your own Immich server, with no data ever sent to Google
- "Saved" tab tracks the items you saved through the extension, with one-click open and copy-link actions
- Drag and drop files onto the popup to upload them straight from your computer

A NEW TAB WORTH OPENING
- A random photo from your library on every new tab
- An optional row of photo details under the date: camera, lens, ISO, aperture, shutter, focal length, dimensions, file size — whatever EXIF data Immich has for that photo
- An optional "On this day" memory strip with photos from past years
- Pick a specific album as the background source
- Optional auto-rotate every 30 seconds to 15 minutes
- Or turn the new tab override off entirely — a minimal clock-only page replaces it (or redirects to a URL of your choice)

ORGANIZED
- Optional default album for every save
- Automatic duplicate detection (using Immich's hash-based dedup, surfaced in the toast)
- Recent uploads kept locally in the popup for quick access

BEAUTIFUL
- Clean modern interface that matches Immich's design language
- Dark and light themes, plus a "match system" option
- Connection status indicator on the toolbar icon (red when the server is unreachable)
- Polished first-run onboarding that walks through creating an API key
- A small "Updated to vX.Y.Z" banner appears once after the browser auto-updates the extension, with a direct link to the release notes
- Built-in "Report a bug" flow on the About page — opens a consent modal that previews exactly which non-sensitive system fields (extension version, browser, OS, Immich version) get prefilled into a GitHub issue, and never includes your API key or server URL

PRIVATE AND SECURE
- All data goes directly to YOUR Immich server
- No analytics, no third-party tracking, no telemetry, no telemetry pixels
- API key stored locally in chrome.storage.local
- The full privacy policy spells out exactly what every permission is used for and what theoretical exposures exist (the Google integration in particular)
- Open source — verify the code yourself

REQUIREMENTS
- A self-hosted Immich server (https://immich.app)
- An API key from your Immich account (the welcome page lists the exact required scopes)
- Chrome or Chromium 114 or newer

Perfect for Immich users who want to save inspiration, memes, references, family photos and screenshots from the web straight to their library — without downloading and re-uploading every time.

---

This is an unofficial community extension and is not affiliated with the Immich project.
```

---

## Detailed description (German / Deutsch)

Optional — Deutsch als zusätzliche Listing-Sprache.

```
Speichere mit einem Rechtsklick Bilder und Videos direkt auf deinem selbstgehosteten Immich-Server.

---

Immich Companion ist eine Browser-Erweiterung für deine selbstgehostete Immich-Foto-Bibliothek. Mit einem Rechtsklick speicherst du Bilder und Videos von jeder Webseite, durchsuchst deine Fotos aus jeder Stelle im Browser und machst aus jedem neuen Tab einen Feed deiner eigenen Erinnerungen.

Die Erweiterung ist für Menschen gebaut, die Immich bereits zu Hause oder auf einem eigenen Server betreiben. Es gibt keine Cloud-Komponente, kein Konto zum Anlegen, keine Telemetrie. Die Erweiterung kommuniziert mit genau einer Adresse: der Immich-Server-URL, die du beim ersten Start einträgst.

EINFACH UND SCHNELL
- Rechtsklick auf ein Bild oder Video, "In Immich speichern" oder "Speichern & teilen" wählen
- Dateien werden sofort auf deinen Server hochgeladen
- Hinweis-Toasts bestätigen jeden Upload — grün bei Erfolg, blau bei Duplikat, rot mit der genauen Fehlermeldung im Fehlerfall
- "Speichern & teilen" erstellt einen öffentlichen Immich-Teilungslink und kopiert ihn mit einem Klick in die Zwischenablage

EINE BIBLIOTHEK-ANSICHT WIE IN EINER MOBILEN GALERIE-APP
- Das Symbolleisten-Popup öffnet sich direkt mit den neuesten Items deiner Bibliothek — masonry-Layout, gruppiert nach Monat mit fixierten Datums-Headern und einem schmalen Jahres-Scrubber am rechten Rand
- Klick auf ein Jahr im Scrubber springt direkt zu diesem Punkt in deiner Bibliothek
- Filter-Pills oberhalb der Treffer schalten die Ansicht mit einem Klick zwischen Alle, nur Fotos und nur Videos um
- Intelligente Suche läuft aus demselben Eingabefeld — bis zu 250 CLIP-Treffer pro Anfrage, in derselben Timeline gruppiert
- Schnellaktionen auf jedem Treffer (per Hover): in die Zwischenablage kopieren, öffentlichen Teilungslink kopieren, Original herunterladen, sowie GPS-Standort des Fotos in Google Maps oder Apple Maps (nur macOS) öffnen
- Wähle, ob die Zwischenablage-Aktion das mittelgroße Vorschaubild (Standard, schnell, funktioniert immer) oder das Original in voller Auflösung kopiert
- Inline-Video-Vorschau — Videos in der Bibliothek bekommen ein Play-Symbol und eine Dauer-Markierung; ein Klick spielt den transcodierten Stream direkt im Popup ab oder öffnet ihn auf Wunsch in einem eigenen 960×600-Player-Fenster mit nativer Vollbild-Unterstützung
- Optional: „Immich-Treffer auf Google anzeigen" — passende Fotos aus deiner Bibliothek erscheinen in einer Karte über Googles Ergebnissen, ohne dass irgendwelche Daten Googles Server berühren
- „Gespeichert"-Tab zeigt die Dateien, die du über die Erweiterung gespeichert hast, mit Ein-Klick-Öffnen und Link-kopieren
- Drag and Drop von Dateien auf das Popup, um sie direkt vom Computer hochzuladen

EIN NEUER TAB, DER SICH LOHNT
- Ein zufälliges Foto aus deiner Bibliothek auf jedem neuen Tab
- Optionale Foto-Details unter dem Datum: Kamera, Objektiv, ISO, Blende, Verschlusszeit, Brennweite, Auflösung, Dateigröße — alles, was Immich an EXIF-Daten für das Foto hat
- Optionaler "An diesem Tag"-Streifen mit Fotos aus vergangenen Jahren
- Bestimmtes Album als Quelle wählbar
- Optionaler Auto-Wechsel alle 30 Sekunden bis 15 Minuten
- Oder die Tab-Übernahme ganz abschalten — eine minimale Uhr-Seite tritt an die Stelle (oder eine Weiterleitung zu einer URL deiner Wahl)

ORGANISIERT
- Optionales Standard-Album für jeden Upload
- Automatische Duplikat-Erkennung (mit Immichs hash-basierter Dedup, im Toast sichtbar)
- Letzte Uploads lokal im Popup gespeichert für schnellen Zugriff

GESTALTUNG
- Schlichte, moderne Oberfläche, die sich in Immichs Designsprache einfügt
- Dunkles und helles Design, plus "Systemeinstellung folgen"
- Verbindungsstatus-Indikator auf dem Symbolleisten-Icon (rot, wenn der Server nicht erreichbar ist)
- Polierte Willkommensseite, die durch die Erstellung eines API-Schlüssels führt

PRIVAT UND SICHER
- Alle Daten gehen direkt an DEINEN Immich-Server
- Keine Analyse, kein Drittanbieter-Tracking, keine Telemetrie, keine Tracking-Pixel
- API-Schlüssel lokal in chrome.storage.local gespeichert
- Die vollständige Datenschutzerklärung erläutert exakt, wofür jede Berechtigung verwendet wird und welche theoretischen Expositionen bestehen (insbesondere bei der Google-Integration)
- Open Source — Code selbst überprüfen

VORAUSSETZUNGEN
- Ein selbstgehosteter Immich-Server (https://immich.app)
- Ein API-Schlüssel aus deinem Immich-Konto (die Willkommensseite listet die exakten benötigten Berechtigungen)
- Chrome oder Chromium 114 oder neuer

Ideal für Immich-Nutzer, die Inspiration, Memes, Referenzen, Familienfotos und Screenshots aus dem Web direkt in ihre Bibliothek speichern wollen — ohne jedes Mal herunterladen und wieder hochladen zu müssen.

---

Diese Erweiterung ist eine inoffizielle Community-Erweiterung und steht in keiner Verbindung zum Immich-Projekt.
```

---

## Single purpose statement / Alleiniger Zweck

The Web Store reviewer cares that the extension has *one* purpose. The trick: frame every feature as a different way of doing the same thing — bridging the browser and the user's Immich server.

### English (recommended)

```
Browser integration for a self-hosted Immich photo server.

Every feature in the extension serves the same single purpose: giving the user read and write access to their own Immich instance from inside their browser. Right-clicking an image saves it to Immich (write). The toolbar popup and the optional inline card on Google search results read the Immich library so it can be searched without leaving the current tab. The new tab page surfaces a random photo and "On this day" memories — again, reading from Immich. There is no functionality unrelated to the Immich integration.
```

### Deutsch

```
Browser-Integration für einen selbstgehosteten Immich-Foto-Server.

Alle Funktionen der Erweiterung dienen demselben einen Zweck: dem Nutzer Lese- und Schreibzugriff auf seine eigene Immich-Instanz direkt aus dem Browser zu ermöglichen. Ein Rechtsklick auf ein Bild speichert es in Immich (Schreibzugriff). Das Symbolleisten-Popup und die optionale eingebettete Trefferkarte auf Google-Suchseiten lesen die Immich-Bibliothek, damit man sie suchen kann, ohne den aktuellen Tab zu verlassen. Die Neuer-Tab-Seite zeigt ein zufälliges Foto und „An diesem Tag"-Erinnerungen — ebenfalls aus Immich gelesen. Es gibt keine Funktion, die nichts mit der Immich-Integration zu tun hat.
```

### Short version (if the field is single-line)

```
Browser companion for a self-hosted Immich photo server: save, search and view your library from any tab.
```
```
Browser-Begleiter für einen selbstgehosteten Immich-Foto-Server: speichern, durchsuchen und ansehen aus jedem Tab.
```

---

## Justification — "Wozu dient der Artikel und warum sollten Nutzer ihn installieren?"

Field in the Store dashboard that asks for a short purpose statement and an install pitch. Two short paragraphs, ~ 400 chars each.

### English

```
Immich Companion connects your browser to your self-hosted Immich server. Save images and videos from any webpage with one right-click, search your library straight from the toolbar popup with photo / video filters and an inline video preview, and turn every new tab into a feed of your own memories.

Install it if you already run Immich and want to stop downloading-then-uploading every time you find something worth keeping. The extension never talks to anything other than the server you configure — no cloud account, no telemetry, no tracking.
```

### Deutsch

```
Immich Companion verbindet deinen Browser mit deinem selbstgehosteten Immich-Server. Speichere Bilder und Videos von jeder Webseite per Rechtsklick, durchsuche deine Bibliothek direkt aus dem Symbolleisten-Popup mit Foto-/Video-Filtern und Inline-Video-Vorschau, und mach jeden neuen Tab zu einem Feed deiner eigenen Erinnerungen.

Installiere die Erweiterung, wenn du Immich bereits selbst betreibst und nicht mehr jedes Mal etwas herunter- und wieder hochladen willst, was du im Web findest. Die Erweiterung kommuniziert ausschließlich mit dem Server, den du konfigurierst — kein Cloud-Konto, keine Telemetrie, kein Tracking.
```

---

## Permission justifications / Begründungen für Berechtigungen

Each field on the dashboard accepts up to 1 000 characters. Paste verbatim. German versions match the dashboard's UI language.

### Hostberechtigung — `<all_urls>`

```
<all_urls> wird aus zwei klar benannten Gründen benötigt, die beide direkt dem alleinigen Zweck der Erweiterung dienen:

1) Wenn der Nutzer auf einer beliebigen Webseite per Rechtsklick auf ein Bild oder Video „In Immich speichern" auswählt, muss die Erweiterung die URL dieser Datei abrufen können, um sie an den vom Nutzer konfigurierten Immich-Server hochzuladen. Da der Nutzer diese Aktion auf jeder beliebigen Seite auslösen kann, ist eine breite Host-Berechtigung der einzige Weg, das zu unterstützen.

2) Die optionale Funktion „Immich-Treffer auf Google anzeigen" fügt eine Karte mit passenden Fotos aus der Bibliothek des Nutzers über den Google-Suchergebnissen ein. Dafür läuft ein Content-Skript auf google.<tld>/search-Seiten.

Die Erweiterung liest oder protokolliert keine anderen Inhalte besuchter Seiten und sendet keine Informationen über sie an Dritte. Sämtliche Netzwerkanfragen gehen ausschließlich an den vom Nutzer konfigurierten Immich-Server.
```

### `contextMenus`

```
Fügt dem Rechtsklick-Menü vier Einträge hinzu, wenn der Nutzer auf ein Bild oder Video klickt: „In Immich speichern", „In Immich speichern & Link kopieren", „Video in Immich speichern" und „Video in Immich speichern & Link kopieren". Ohne diese Berechtigung gäbe es keinen Weg, die zentrale Funktion der Erweiterung — Inhalte per Rechtsklick in die Immich-Bibliothek zu speichern — bereitzustellen. Die Einträge können in den Einstellungen abgeschaltet werden.
```

### `storage`

```
Speichert die vom Nutzer eingegebene Immich-Server-URL, den API-Schlüssel, die Funktions-Schalter (z. B. „Treffer auf Google anzeigen" an/aus), die Theme-Einstellung, das Standard-Album sowie die Liste der letzten 30 Uploads (Dateiname, Asset-ID, Teilungslink falls vorhanden) lokal über chrome.storage.local. Es gibt keinen Cloud-Speicher, keine geräteübergreifende Synchronisierung und keinen externen Backend-Dienst — alle Daten bleiben auf dem Gerät des Nutzers.
```

### `notifications`

```
Zeigt eine Desktop-Benachrichtigung an, sobald ein Upload zum Immich-Server abgeschlossen ist — mit unterschiedlichen Texten je nach Ergebnis (Erfolg, bereits in der Bibliothek vorhanden, Fehler mit Fehlermeldung). Diese ergänzen die in-page Toasts und sind nützlich, wenn der Quell-Tab nicht mehr im Vordergrund ist. Vom Nutzer in den Einstellungen vollständig abschaltbar.
```

### `activeTab`

```
Wird verwendet, um die in-page Upload-Toasts (oben rechts) im aktiven Tab anzuzeigen, in dem der Nutzer die Speichern-Aktion ausgelöst hat. Außerdem nötig, damit der nach einer „Speichern & teilen"-Aktion erzeugte öffentliche Immich-Teilungslink in die Zwischenablage geschrieben werden kann (Browser verlangen für Zwischenablage-Zugriff einen Bezug zum aktiven Tab).
```

### `alarms`

```
Plant eine periodische Verbindungsprüfung (alle 5 Minuten) zum vom Nutzer konfigurierten Immich-Server. Anhand des Ergebnisses wird der Status-Indikator auf dem Symbolleisten-Icon aktualisiert, sodass der Nutzer sofort erkennt, ob sein Server gerade erreichbar ist (z. B. nach einem Heimnetzwerk-Ausfall). Es werden keine anderen Hosts kontaktiert.
```

### `clipboardWrite`

```
Schreibt den nach einer „Speichern & teilen"-Aktion erstellten öffentlichen Immich-Teilungslink in die Zwischenablage, damit der Nutzer ihn sofort in eine andere Anwendung (Chat, E-Mail, Notiz) einfügen kann. Wird ausschließlich für diesen einen Zweck verwendet — die Erweiterung liest niemals Inhalte aus der Zwischenablage und schreibt nichts ohne explizite Nutzeraktion.
```

---

### Remote Code question — "Nutzt du Remote Code?"

Answer: **Nein, ich verwende "Remote Code" nicht** / **No, I do not use remote code**.

#### Justification (Deutsch, ~ 990 chars)

```
Die Erweiterung lädt oder führt keinerlei Remote-Code aus. Sämtliches JavaScript, HTML und CSS ist im Erweiterungspaket enthalten und wird unverändert ausgeführt. Es gibt keine eval()-Aufrufe, kein dynamisches new Function() mit Strings aus dem Netzwerk, keine externen <script>-Tags und kein dynamisches Nachladen von JavaScript-Modulen oder Bibliotheken über das Internet.

Die Netzwerkkommunikation der Erweiterung beschränkt sich auf zwei Arten von Anfragen: (1) JSON- und Multipart-Upload-Anfragen an den vom Nutzer konfigurierten Immich-Server (Asset-Upload, Suche, Albumverwaltung, Teilungslink-Erstellung) und (2) das Herunterladen von Bild-/Video-Inhalten von einer beliebigen Webseite zum Zweck des Hochladens an Immich, ausgelöst durch den Nutzer per Rechtsklick.

Der Inhalt dieser Antworten wird ausschließlich als Daten verarbeitet (JSON, Bild-Bytes als Blob-URLs zur Anzeige) — niemals als ausführbarer Code interpretiert.
```

#### English

```
The extension does not load or execute any remote code. All JavaScript, HTML, and CSS is bundled inside the extension package and runs unmodified. There are no eval() calls, no dynamic new Function() construction from network strings, no external <script> tags, and no dynamic loading of JS modules or libraries from the internet.

The extension's network traffic is limited to two kinds of requests: (1) JSON and multipart upload requests to the user-configured Immich server (asset upload, smart search, album operations, share-link creation) and (2) downloading image/video content from arbitrary webpages for the purpose of uploading it to Immich, triggered by an explicit user right-click.

Response bodies are processed strictly as data (JSON, image bytes rendered via blob URLs) — never interpreted as executable code.
```

---

### English permission justifications (kept for reference)

```
host_permissions <all_urls>:
Required for two purposes: (1) when the user right-clicks an image or video on any website and chooses "Save to Immich", the extension fetches that asset's URL and uploads it to the user's configured Immich server; (2) the optional "Show Immich matches on Google" feature injects a result card on google.<tld>/search pages with photos from the user's library that match their query. The extension does not read or log content from visited pages and does not transmit information about them anywhere — all network traffic goes only to the Immich server the user configures.

contextMenus:
Adds four entries to the right-click menu when the user clicks an image or video: "Save to Immich", "Save to Immich & copy share link", and the same two for videos. The extension's core functionality requires this.

storage:
Stores the user's Immich server URL, API key, feature toggles, theme preference, default album, and the most recent 30 uploads locally via chrome.storage.local. No remote storage, no sync.

notifications:
Shows a desktop notification when an upload to Immich completes (success / duplicate / error with the actual error message). Disableable in settings.

activeTab:
Renders the in-page upload toasts on the source tab and lets the share link be written to the clipboard after "Save & share" (browsers gate clipboard access on the active tab).

alarms:
Schedules a periodic (every 5 minutes) connection check to the configured Immich server so the toolbar icon's status badge stays accurate. No other hosts are contacted.

clipboardWrite:
Writes the public Immich share link to the clipboard after "Save & share" actions only. The extension never reads the clipboard.
```

---

## Privacy policy URL

Public gist hosting the contents of PRIVACY.md:

```
https://gist.github.com/bjoernch/d4b5faceb57ce2c1acd1986be729e7a0
```

Paste that into the dashboard's "Privacy policy URL" field. The gist URL is permanent — it is never recreated, only updated.

The [`sync-privacy-gist.yml`](.github/workflows/sync-privacy-gist.yml) workflow auto-pushes any change to `PRIVACY.md` on `main` into the gist via `gh gist edit`. Manual fallback if the workflow ever fails:

```
gh gist edit d4b5faceb57ce2c1acd1986be729e7a0 PRIVACY.md
```

Workflow setup (one time): create a Classic Personal Access Token with `gist` scope at <https://github.com/settings/tokens/new> and add it as a repo secret named `GIST_TOKEN`. Fine-grained PATs cannot write gists today — Classic is required. Without the secret the workflow fails loud (visible in the Actions tab), which is the desired signal.

## Data Usage form

The extension collects nothing in the Web Store's sense (no backend, no analytics, no telemetry — all data either stays in chrome.storage.local on the user's device or goes only to the user's own Immich server). Recommended answers:

- **Categories**: leave all 9 unchecked.
- **Three confirmations**: tick all three (no sale, only for stated purpose, not for credit-worthiness).

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

## Build the submission zips

From the repo root:

```
./build.sh
```

Produces three files in `dist/`:

- `immich-companion-chrome-<version>.zip` — Chrome / Edge / Brave / Chromium-based browsers.
- `immich-companion-firefox-<version>.zip` — Firefox AMO. Identical contents; manifest has Chrome-only `minimum_chrome_version` stripped.
- `immich-companion-<version>.zip` — alias of the Chrome build for the GitHub Action and older paths.

Each zip contains only runtime files (manifest, JS, CSS, HTML, icon PNGs, LICENSE). Excluded: `.git`, dev markdown, the `webstore-assets/` folder, Python source, and any `.DS_Store` / `__pycache__` cruft.

Upload the matching zip to each store.
