# Immich Companion

A Chrome / Chromium extension that connects to your self-hosted [Immich](https://immich.app) server.

- **Save to Immich** — right-click any image or video on the web → upload it to your library, optionally to a default album.
- **Save & share** — same as above, but also creates a public share link and copies it to your clipboard.
- **Omnibox search** — type `im` + space + a query in the address bar for live CLIP-powered smart search.
- **Toolbar popup** — search your library, view recent uploads, drag-and-drop files to upload.
- **New tab** — random photo from your library as the background, "On this day" memory strip, optional auto-rotate, optional album source.
- **Share-album toolbar** — Slideshow + Download-all controls on your own Immich `/share/...` URLs.
- **Light & dark themes**, customisable per-feature.

Everything runs against your own server. No third-party services involved.

## Install (development)

1. Clone the repo.
2. Open `chrome://extensions` and enable **Developer mode**.
3. **Load unpacked** → pick the cloned folder.
4. The welcome tab opens automatically — paste your Immich server URL and API key.

## API key

Create one in **Immich → Account Settings → API Keys**.

The welcome page shows the exact scopes the extension uses. The minimal set is:

| Scope                  | Why                                                      |
| ---------------------- | -------------------------------------------------------- |
| `asset.upload`         | Save images and videos to your library                    |
| `asset.read`           | Show search results, thumbnails, new-tab background       |
| `asset.view`           | Open assets when clicked                                  |
| `album.read`           | List albums in the settings dropdowns                     |
| `albumAsset.create`    | Add saved items to your default album (optional)          |
| `sharedLink.create`    | "Save & share" — create a public link                     |

If your Immich version (≤ 1.106) only offers all-or-nothing keys, that works too.

## Keyboard shortcut

`Ctrl+Shift+L` (`⌘+Shift+L` on Mac) opens the popup. Re-bind at `chrome://extensions/shortcuts`.

## Privacy

See [PRIVACY.md](PRIVACY.md). Short version: the only data the extension sees is what you type into Settings (server URL + API key) and the URLs of items you explicitly save. Everything is sent only to the Immich server you configured. Nothing is sent anywhere else, ever.

## Building Web Store assets

The icons and promo tile are generated from `icons/make_icons.py` and `webstore-assets/make_assets.py`. Both need Pillow (`pip install Pillow`).

## License

[MIT](LICENSE).
