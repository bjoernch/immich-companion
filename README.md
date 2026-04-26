<p align="center">
  <img src="webstore-assets/banner-1280x400.png" alt="Immich Companion" width="100%" />
</p>

<p align="center">
  <strong>A browser companion for your self-hosted <a href="https://immich.app">Immich</a> server.</strong><br/>
  <em>Coming soon to the Chrome Web Store and Firefox AddOn Store.</em>
</p>

---

## Features

### Save the web to your library
Right-click any image or video on any website to upload it directly to your Immich server. Optionally adds every saved item to a default album.

### Save & share
One click uploads the asset, creates a public Immich share link, and copies it to your clipboard — ready to paste anywhere.

### Smart search, everywhere
- **Address bar** — type `im` + space + a query for live CLIP-powered results.
- **Toolbar popup** — masonry grid of search results, your recent uploads, and a drag-and-drop file uploader.
- **Google search results** — when you Google something, photos in your library that match the query appear in a card at the top of the results. The search runs entirely between your browser and your Immich; nothing is sent to Google.

### New tab as a memory feed
A random photo from your library greets you on every new tab, with an "On this day" strip showing memories from past years. Pick a specific album as the source, choose an auto-rotate interval, or turn it off entirely.

### Polished little things
Dark and light themes, keyboard shortcut (`Ctrl+Shift+L` / `⌘+Shift+L`), connection-status badge on the toolbar icon, in-page upload toasts, share-album toolbar (Slideshow + Download-all) on your Immich `/share/...` URLs.

---

## Privacy

The extension transmits data **only** to the Immich server you configure. No analytics, no third-party services, no tracking. Your API key stays in `chrome.storage.local` on your device.

→ [Full privacy policy](PRIVACY.md)

---

## Install (while the Web Store listing is in review)

1. Download the latest zip from the [Releases](https://github.com/bjoernch/immich-companion/releases) page and unzip it.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick the unzipped folder.
3. The welcome page opens automatically — paste your Immich server URL and API key.

You need an [Immich](https://immich.app) instance you can sign into. The welcome page shows the exact API-key scopes to grant.

---

## License

[MIT](LICENSE).
