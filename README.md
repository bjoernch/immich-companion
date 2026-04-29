<p align="center">
  <img src="webstore-assets/github-hero.png" alt="Immich Companion — your photo library follows you around the web" width="100%" />
</p>

<p align="center">
  <!-- Store-button images. All bundled locally in webstore-assets/ so the
       README never depends on an external CDN. Once a listing goes live,
       swap the href on the matching <a> to the actual store URL. -->
  <a href="#install" title="Chrome Web Store — pending review">
    <img height="58" alt="Available in the Chrome Web Store"
         src="webstore-assets/chrome-webstore-badge.svg">
  </a>
  &nbsp;
  <a href="#install" title="Firefox Add-ons — pending review">
    <img height="58" alt="Get the Firefox Add-on"
         src="webstore-assets/firefox-addons-badge.svg">
  </a>
  &nbsp;
  <a href="#install" title="Microsoft Edge Add-ons — pending review">
    <img height="58" alt="Available in the Microsoft Edge Add-ons store"
         src="webstore-assets/edge-addons-badge.svg">
  </a>
</p>

<p align="center">
  <strong>A community browser extension for self-hosted <a href="https://immich.app">Immich</a>.</strong><br/>
  Save anything you see on the web, smart-search your library from the toolbar popup, and turn every new tab into a memory.
</p>

<p align="center">
  <em>The store listings are pending review at the Chrome Web Store, Firefox Add-ons, and Microsoft Edge Add-ons. While you're waiting, you can install the extension from the latest <a href="https://github.com/bjoernch/immich-companion/releases">release</a> — see <a href="#install">install instructions</a> below.</em>
</p>

---

## Features

### Save the web to your library
Right-click any image or video on any website to upload it directly to your Immich server. Optionally adds every saved item to a default album.

### Save &amp; share
One click uploads the asset, creates a public Immich share link, and copies it to your clipboard — ready to paste anywhere.

### Smart search, everywhere
- **Toolbar popup** — phone-gallery-style timeline grouped by month, with sticky date headers and a year scrubber on the right edge. Same view for both your most recent items and search results, with quick actions on every photo (copy to clipboard, share link, download original, open in maps).
- **Google search results** — when you Google something, photos in your library that match the query appear in a card at the top of the results. The search runs entirely between your browser and your Immich; nothing is sent to Google.

### New tab as a memory feed
A random photo from your library greets you on every new tab, with an "On this day" strip showing memories from past years. Optional EXIF detail row underneath the date — camera, lens, ISO, aperture, shutter, focal length, dimensions. Pick a specific album as the source, choose an auto-rotate interval, or turn it off entirely.

### Polished little things
Dark and light themes (with system-match), keyboard shortcut (`Ctrl+Shift+L` / `⌘+Shift+L`), connection-status badge on the toolbar icon, in-page upload toasts, share-album toolbar (Slideshow + Download-all) on your Immich `/share/...` URLs, drag-and-drop file uploads, automatic duplicate detection.

---

## Privacy

The extension transmits data **only** to the Immich server you configure. No analytics, no third-party services, no tracking. Your API key stays in `chrome.storage.local` on your device.

→ [Full privacy policy](PRIVACY.md)

---

## Install

### Chrome / Edge / Brave / any Chromium browser

1. Download `immich-companion-chrome-<version>.zip` from the latest [release](https://github.com/bjoernch/immich-companion/releases).
2. Unzip it.
3. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick the unzipped folder.

### Firefox

1. Download `immich-companion-firefox-<version>.zip` from the latest [release](https://github.com/bjoernch/immich-companion/releases).
2. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on…** and pick the zip directly.

> Firefox 121 or newer is required. Temporary add-ons are removed when you restart Firefox; for a permanent install, wait for the AMO listing to go live.

### After install

The welcome tab opens automatically. You'll need:
- A self-hosted [Immich](https://immich.app) instance you can sign into.
- An API key from your Immich account — Account Settings → API Keys. The welcome page lists the exact required scopes.

The keyboard shortcut `Ctrl+Shift+L` (`⌘+Shift+L` on macOS) opens the popup.

---

## License

[MIT](LICENSE). Unofficial community extension. Not affiliated with the [Immich](https://immich.app) project.
