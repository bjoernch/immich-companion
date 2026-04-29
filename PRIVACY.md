# Privacy Policy — Immich Companion

_Last updated: 2026-04-29_

Immich Companion is a browser extension that connects to a self-hosted [Immich](https://immich.app) server you control. It does not have a backend service. All network traffic goes to one place: your Immich server.

## Data the extension stores locally

The extension stores the following in `chrome.storage.local` on your device:

- **Server URL and API key** — entered by you in the Settings or onboarding page. Used to authenticate to your Immich server.
- **Feature toggles** — your preferences (light/dark theme, which features are enabled, default album, etc.).
- **Recent uploads list** — the last 30 items you saved, including filename, asset id, and (if applicable) the share link. Stored locally so the popup can show them. Cleared via *Clear history* in the popup.

This data never leaves your device except for the parts that the extension explicitly sends to your Immich server during normal use.

## Data the extension transmits

The extension talks **only to the Immich server URL you configure**. Specifically:

- API requests authenticated with your API key (`x-api-key` header) for: uploading assets, listing albums, performing CLIP smart search, fetching thumbnails, creating share links, and pinging for connection status.
- Files / image URLs you explicitly choose to save — fetched by the extension from their original location, then uploaded to your Immich server.

## Data the extension does **not** collect or transmit

- No analytics, telemetry, crash reports, or usage data.
- No third-party servers are contacted.
- No advertising or tracking SDKs.
- No browsing history is read or sent anywhere.

## Google search integration

The extension has an optional feature ("Show Immich matches on Google", off by default, toggleable in Settings → Features) that displays an inline result card on Google search pages with photos from your library that match the query.

**No Immich data ever travels through Google's network.** When you search Google, the extension's content script reads your query from the URL and asks the extension's background service worker to perform a CLIP smart search against your Immich server. The HTTP request goes directly from the background service worker to your Immich server — Google's servers are not involved.

**What appears in Google's page DOM** (theoretically inspectable by their JavaScript, though their analytics do not in practice scrape arbitrary DOM nodes injected by extensions):

- The HTML of the result card.
- Each thumbnail as a `blob:` URL — these reference image bytes held only in your browser's memory, not transmitted anywhere.
- A "View all in Immich" link with your Immich server URL in the `href`.
- Each thumbnail link with the Immich asset UUID in the `href`.

**What does *not* appear in Google's page or travel to Google:**

- Your API key. It stays in `chrome.storage.local` and is only added to the request header inside the background service worker.
- Image bytes, file names, EXIF, location, dates, or any other metadata.
- Any network traffic to your Immich server.

**Worst-case theoretical exposure**, if Google were to actively scrape extension-injected DOM (which they don't): your Immich server's hostname and the opaque UUIDs of matching assets. Nothing more.

To turn the feature off entirely (no requests fired on Google pages, no DOM injection): toggle **Show Immich matches on Google** off in Settings → Features.

## Maps integration

The extension has an optional feature ("Open in Maps", configurable in Settings → Features) that adds a map-pin button to each photo card in the popup. Clicking it opens the photo's GPS location in a third-party maps app. There are three settings:

- **Off** — no button is rendered. No data is transmitted.
- **Google Maps** (default) — clicking the button opens `https://www.google.com/maps?q=<lat>,<lng>` in a new browser tab.
- **Apple Maps** (macOS only) — clicking the button hands `maps://?q=<lat>,<lng>` to the OS, which launches the macOS Maps.app. The option is disabled on operating systems that have no handler for the `maps://` scheme.

Only one provider can be active at a time.

**What is sent to the third-party app/service when you click the button:**

- The latitude and longitude of the selected photo, encoded into the URL. This is a navigation (browser tab open or OS handoff), not an API call. The third party sees the request the same way it would if you'd typed the URL by hand.

**What is *not* sent:**

- The image itself, the thumbnail, the filename, the asset UUID, your Immich server URL, or your API key.
- No metadata beyond the two numbers in the URL.

The button only appears for photos that actually have GPS coordinates in their EXIF data. If a photo has no location, the click surfaces a brief "No GPS info" error and nothing is transmitted. To turn the feature off entirely (no button rendered, no data ever sent): set **Open in Maps** to **Off** in Settings → Features.

## Bug reporting (opt-in, per-click)

The About section in Settings has a "Found a bug?" card that, when clicked, opens a consent modal showing exactly which fields will be added to a prefilled GitHub issue:

- Extension version (read from the bundled manifest).
- Browser name and version (read from `navigator.userAgentData` or the User-Agent string).
- Operating system (read from `navigator.userAgentData.platform` plus a high-entropy version pull when the browser exposes it).
- Immich server version — only included when you have a server configured. The extension makes a single `GET /api/server/version` call to *your own Immich server* (using your stored API key), parses the response, and uses only the resulting `major.minor.patch` string. Nothing else from the response is read.

The consent modal previews these values before anything is sent. The information is transmitted only when you click **Continue** — at which point a new tab is opened to GitHub's prefilled issue form. You can edit any field on the GitHub form, and submitting the issue is a separate, deliberate action.

**What the bug-report flow never includes:**

- Your Immich API key.
- Your Immich server URL or hostname.
- Any photo, video, thumbnail, filename, asset id, search history, or upload history.
- Any data beyond the four lines listed above.

The modal also offers a "Continue without info" button that opens the standard GitHub issue picker without any prefill.

## Required browser permissions

| Permission                           | Reason                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `host_permissions: <all_urls>`       | To fetch image / video URLs from any page when you save them to Immich. |
| `storage`                            | To save your settings locally.                                          |
| `contextMenus`                       | To add the right-click "Save to Immich" entries.                        |
| `notifications`                      | To show desktop notifications when an upload finishes.                  |
| `activeTab`                          | To render in-page upload toasts on the source tab.                      |
| `alarms`                             | To periodically check whether the Immich server is reachable.           |
| `clipboardWrite`                     | To copy share links to your clipboard via the "Save & share" feature.   |

## Removing your data

Uninstalling the extension removes everything it stored locally. The API key entry is _not_ revoked on the Immich side automatically — to revoke it, delete the key in **Immich → Account Settings → API Keys**.

## Contact

The extension is open-source. Issues and questions: open an issue at the repository.
