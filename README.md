<p align="center">
  <img src="webstore-assets/banner-1280x400.png" alt="Immich Companion" width="100%" />
</p>

# Immich Companion

A Chrome / Chromium extension that connects to your self-hosted [Immich](https://immich.app) server.

- **Save to Immich** — right-click any image or video on the web → upload it to your library, optionally to a default album.
- **Save & share** — same as above, but also creates a public share link and copies it to your clipboard.
- **Omnibox search** — type `im` + space + a query in the address bar for live CLIP-powered smart search.
- **Toolbar popup** — search your library, view recent uploads, drag-and-drop files to upload.
- **New tab** — random photo from your library as the background, "On this day" memory strip, optional auto-rotate, optional album source.
- **Inline matches on Google** — an Immich result card appears at the top of Google search results when your library has matching photos. Search runs entirely between your browser and your Immich; nothing is sent to Google. See [PRIVACY.md](PRIVACY.md) for details.
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

## Building the extension zip

```
./build.sh
```

Writes `dist/immich-companion-<version>.zip` containing only the runtime files (manifest, JS, CSS, HTML, icon PNGs, LICENSE). Upload that zip to the Chrome Web Store.

## Releases

Push a tag matching the manifest version and the GitHub Action in `.github/workflows/release.yml` builds the zip and attaches it to a GitHub Release:

```
git tag v$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
git push --tags
```

### Optional: auto-publish to the Chrome Web Store

Set these four repository secrets and the same workflow will also push the new build to the Web Store after tagging:

| Secret                     | What it is                                                  |
| -------------------------- | ----------------------------------------------------------- |
| `WEBSTORE_EXTENSION_ID`    | The 32-char id shown in the Web Store dashboard after your first manual upload |
| `WEBSTORE_CLIENT_ID`       | Google Cloud OAuth 2.0 client ID                            |
| `WEBSTORE_CLIENT_SECRET`   | matching client secret                                      |
| `WEBSTORE_REFRESH_TOKEN`   | long-lived refresh token from a one-time OAuth dance        |

Step-by-step for the OAuth credentials: <https://developer.chrome.com/docs/webstore/using-api>. The first version still has to be uploaded manually so you can fill in the listing fields, screenshots, and privacy policy URL — automation only handles subsequent updates.

## License

[MIT](LICENSE).
