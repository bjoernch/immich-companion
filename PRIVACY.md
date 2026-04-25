# Privacy Policy — Immich Companion

_Last updated: 2026-04-25_

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

The extension has an optional feature ("Show Immich matches on Google", on by default, toggleable in Settings → Features) that displays an inline result card on Google search pages with photos from your library that match the query.

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

## Required browser permissions

| Permission                           | Reason                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `host_permissions: <all_urls>`       | To fetch image / video URLs from any page when you save them to Immich. |
| `storage`                            | To save your settings locally.                                          |
| `contextMenus`                       | To add the right-click "Save to Immich" entries.                        |
| `notifications`                      | To show desktop notifications when an upload finishes.                  |
| `activeTab`, `scripting`             | To render in-page upload toasts on the source tab.                      |
| `alarms`                             | To periodically check whether the Immich server is reachable.           |
| `clipboardWrite`                     | To copy share links to your clipboard via the "Save & share" feature.   |

## Removing your data

Uninstalling the extension removes everything it stored locally. The API key entry is _not_ revoked on the Immich side automatically — to revoke it, delete the key in **Immich → Account Settings → API Keys**.

## Contact

The extension is open-source. Issues and questions: open an issue at the repository.
