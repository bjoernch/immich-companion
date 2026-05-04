# Security Policy

This document describes the security model of Immich Companion and how to report vulnerabilities. **The most important thing: your API key never leaves your device except as a header to your own configured Immich server.**

---

## Reporting a vulnerability

If you believe you've found a security issue in Immich Companion, please **do not open a public GitHub issue**. Public issues are visible to everyone immediately, which is the wrong way to surface a security bug while it's unpatched.

Instead:

1. Open a [private security advisory](https://github.com/bjoernch/immich-companion/security/advisories/new) on the GitHub repo. Only the maintainer can see this.
2. Or email `bjoernch@users.noreply.github.com` with a subject line starting with `[security]`.

Please include:

- Affected extension version (Settings → About → version, or `chrome://extensions` / `about:addons`).
- Affected browser and OS.
- A clear reproduction: what you did, what you expected, what happened.
- An assessment of impact, even if rough — what could a malicious actor do with this?

You can expect:

- An acknowledgement within **3 business days**.
- A coordinated disclosure timeline. Typical patching window for a confirmed issue is **7–14 days** depending on severity; we aim to ship a fix to all three stores (Chrome Web Store, Firefox Add-ons, Microsoft Edge Add-ons) before public disclosure.
- Credit in the release notes when the fix ships, unless you'd rather stay anonymous.

We don't currently offer a paid bug bounty. The project is single-maintainer and unfunded.

---

## Threat model

The extension's job is to bridge the user's browser and the user's own self-hosted Immich server. There's no developer backend, no analytics service, no third-party SDKs, and no telemetry. The interesting attack surface is therefore narrow:

| Asset | Sensitivity | Why it matters |
|---|---|---|
| **Immich API key** | High | Grants whatever scopes the user ticked when generating it (typically read/write to their photo library). |
| **Immich server URL / hostname** | Medium | Reveals the user's self-hosted address, but isn't itself a secret. |
| **Photos / videos saved through the extension** | High | The user's own data; never sent anywhere except their Immich server. |
| **Recent-uploads list (last 30 entries)** | Low | Filenames + asset IDs, no image bytes. Stored locally only. |

The threats we explicitly defend against:

- A malicious **third-party website** trying to read the API key, server URL, or any saved photo metadata via JavaScript.
- A malicious **third-party website** triggering uploads, downloads, share-link creation, or any other Immich API call without user intent.
- The extension itself accidentally **leaking the API key** to a destination other than the configured Immich server.

The threats we do **not** defend against (intentionally out of scope):

- A malicious browser extension running on the same profile. By design, browser extensions can read each other's data only in narrow, documented ways, but a sufficiently privileged extension could theoretically interfere.
- A compromised Immich server. The extension trusts whatever the server returns.
- A compromised browser binary. If the browser itself is malicious, no extension can defend against it.
- Physical access to an unlocked device.

---

## API key handling

The API key is stored in `chrome.storage.local` on the device. That namespace is per-extension and isolated from web pages — no website can read it via DOM, JavaScript, cookies, or any client-side API.

Where the API key is *read*:

- [`lib/immich.js`](lib/immich.js)'s `request()` and `uploadAsset()` — added to outbound HTTP requests as the `x-api-key` header. The destination is always the user's configured `serverUrl`.
- [`background.js`](background.js) — for the thumbnail proxy, the share-link toast, and the Firefox-only background-driven download.
- [`pages/popup.js`](pages/popup.js), [`pages/newtab.js`](pages/newtab.js), [`pages/player.js`](pages/player.js) — same pattern, all `x-api-key` headers to `serverUrl`.

Where the API key is **never read**:

- [`content.js`](content.js) — the script that runs on every webpage. It never imports or accesses the API key. Authenticated requests are routed through `chrome.runtime.sendMessage` to the background script, which then talks to Immich. The actual key bytes never enter content-script context.

Defensive structural property: the **bug-report consent flow** in [`pages/options.js`](pages/options.js) builds the prefilled-issue URL via `URLSearchParams.set()` calls that explicitly enumerate exactly five fields (extension version, browser, browser version, OS, Immich version). There is no code path by which the API key or server URL could enter that builder. Same for the **update banner** in [`pages/popup.js`](pages/popup.js): the GitHub release URL only encodes the version string from the manifest.

The privacy policy ([PRIVACY.md](PRIVACY.md)) goes through the same enumeration with concrete file paths.

---

## Server URL handling

The hostname of the user's Immich server appears in two places visible to non-Immich destinations, both feature-toggleable:

1. **Google search inline card** ([content.js:286](content.js)) — the "View all in Immich →" link's `href`. **Off by default** since v0.6.0; the user must opt in via Settings → Features.
2. **Share-link toast on the source tab** when using "Save & share" — by design, since the user needs to see and copy the link.

Both surfaces leak the **hostname only**, never the API key. The hostname is roughly equivalent to your IP address — preference data, not a secret.

Outside those two opt-in surfaces, the server URL is only used inside extension contexts (popup, options page, background service worker) which web pages cannot inspect.

---

## Network behaviour

**Hosts the extension contacts:**

- The user's configured `serverUrl` — for all API calls (upload, search, thumbnails, downloads, share-link creation, server-version probes for the bug-report flow).
- `https://github.com/...` — only when the user *explicitly clicks* the bug-report card or the update banner's "Release notes" link, and only as a tab navigation (not a programmatic API call). The destination is GitHub's public site.
- `https://www.google.com/maps`, `maps://` — only when the user *explicitly clicks* the Maps quick-action on a photo with GPS info, and only as a tab navigation. Only the photo's lat/lng is encoded into the URL; nothing else.
- The image source URL the user *explicitly right-clicks* and chooses "Save to Immich". The bytes are then forwarded to the user's Immich server.

**Hosts the extension never contacts:**

- Any analytics or telemetry service.
- Any third-party SDK or CDN.
- Any developer-controlled backend (there isn't one).

---

## Permission model

The extension declares the narrowest set of permissions necessary:

| Permission | Reason |
|---|---|
| `host_permissions: <all_urls>` | (1) Fetching arbitrary image / video URLs the user explicitly chooses to save. (2) The optional "Show Immich matches on Google" content-script feature. |
| `contextMenus` | The right-click "Save image to Immich" entries. |
| `storage` | Local config (API key, server URL, feature toggles, recent-uploads list). |
| `notifications` | Optional desktop notification when an upload completes. Toggleable in Settings. |
| `activeTab` | Render the in-page upload toast on the source tab; provide clipboard access for share-link copy. |
| `alarms` | Periodic 5-minute connectivity ping to update the toolbar-icon connection status. |
| `clipboardWrite` | Copy share links to the clipboard after "Save & share". |
| `downloads` (Firefox build only) | Background-driven download of originals (Chrome's popup-side `<a download>` works fine; the permission is added only on Firefox where popup focus loss makes it unreliable). |

No `scripting`, no `cookies`, no `webRequest`, no `webRequestBlocking`, no `tabs` (we only use `chrome.tabs.create` / `sendMessage` which don't require it), no `history`, no `bookmarks`, no `geolocation`, no `identity`. The extension cannot read or modify your browsing history, cookies, bookmarks, or any other website's data.

---

## Build provenance

Releases are built by the [release.yml](.github/workflows/release.yml) GitHub Actions workflow on tag push, from the public source tree. The same workflow attaches the resulting Chrome and Firefox zips to each GitHub release, so anyone can download those zips, hash them, and compare with what's distributed by the stores.

The repository has no minified or transpiled code — every `.js`, `.html`, and `.css` file in the published zip is the same hand-written source you can read on GitHub. No remote code is loaded at runtime; there are no `eval()` calls, no dynamic `new Function(...)` from network strings, no external `<script>` tags.

Future hardening on the roadmap: GitHub-issued [Sigstore build attestations](https://github.com/actions/attest-build-provenance) so the cryptographic chain "this exact zip was produced from this commit by this workflow" is verifiable in one command.

---

## Known limitations

- **Browser extensions are not security boundaries against the user.** Anyone with access to the browser profile can open `chrome://extensions` (or `about:debugging`), inspect storage, and read the API key. This is a browser-platform property, not specific to this extension.
- **The Immich web UI's session cookie** can grant access to the same data the API key does, with similar caveats. Treat your Immich login the same way you'd treat any self-hosted-service login.
- **Self-signed TLS certificates** require browser-level trust. Without it, the extension's connection attempts will fail; we cannot bypass certificate validation from inside the extension.

---

## Acknowledgements

Vulnerabilities reported responsibly under this policy will be credited in the [release notes](https://github.com/bjoernch/immich-companion/releases) once a fix ships.
