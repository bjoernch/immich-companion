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

## Detailed description

```
Immich Companion is a browser extension that connects to a self-hosted Immich server you already run. It does not have a backend, does not collect telemetry, and never sends your data to anyone other than your own Immich.

WHAT IT DOES

• Save to Immich — right-click any image or video on the web to upload it. Optionally adds every saved item to a default album.

• Save & share — uploads the asset, creates a public Immich share link, and copies it to your clipboard. One click, paste anywhere.

• Smart-search popup — click the toolbar icon to search your library with CLIP. The popup also has a Recent tab (your last 30 saves with one-click "Copy link" / "Open") and an Upload tab (drag and drop files from your computer).

• Omnibox search — type "im" + space + a query in the address bar for live results from your library. Press Enter to open the full search on your Immich.

• Inline matches on Google — when you Google something, photos in your library that match the query appear in a card at the top of the results. The search runs directly between your browser and your Immich; Google's servers are not involved.

• New tab page — a random photo from your library as the background, plus an "On this day" strip of memories from past years. Pick a specific album for the source, or set an auto-rotate interval.

• Share-album toolbar — on your Immich /share/... URLs, a small toolbar adds Slideshow and Download-all controls.

• Dark and light themes, keyboard shortcut (Ctrl+Shift+L / ⌘+Shift+L), connection-status badge on the toolbar icon.

REQUIREMENTS

You need a working Immich server you can sign into. The first-run welcome page walks you through creating an API key with the minimum required scopes: asset.upload, asset.read, asset.view, album.read, albumAsset.create, sharedLink.create. If your Immich version only has all-or-nothing keys, that works too.

PRIVACY

The extension stores your server URL and API key locally in chrome.storage.local. It transmits data only to the Immich server URL you configure. No analytics, no third-party services, no tracking. Full privacy policy at the URL below.

OPEN SOURCE

MIT-licensed. Source on GitHub.
```

---

## Single purpose statement

```
Companion for self-hosted Immich servers — save, search and share photos and videos.
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
