# Safari Port (WIP)

This folder is the starting point for a Safari Web Extension port. The current extension sources have been copied into `Safari-Immich/Extension` so you can run Apple’s converter and generate an Xcode project without touching the Chrome/Firefox build.

## Next steps (Xcode)

1. From the repo root, run Apple’s converter:
   - `xcrun safari-web-extension-converter immich-companion/Safari-Immich/Extension --project-location immich-companion/Safari-Immich`
2. Open the generated Xcode project in `Safari-Immich`.
3. Set your Team and Bundle ID, then build/run the app target.

## Compatibility checklist (to verify during port)

- **New tab override**: confirm whether Safari supports `chrome_url_overrides.newtab`. If not, we’ll need a fallback (e.g., a toolbar button that opens `pages/newtab.html`) and default `featureNewtab` to off in Safari builds.
- **`chrome` vs `browser` namespace**: confirm Safari’s namespace support. If Safari only exposes `browser`, we’ll add a small shim to map `globalThis.chrome = globalThis.browser` before any API use.
- **Permissions & APIs**: verify Safari support for `contextMenus`, `notifications`, `alarms`, `commands`, `clipboardWrite`, and `downloads`. The code already guards `chrome.downloads` and can fall back when unsupported.
- **MV3 service worker**: confirm Safari version’s MV3 service worker support and lifecycle behavior.

## Notes

- The Safari port should only change files under `Safari-Immich/` to avoid impacting the Chrome/Firefox release pipeline.
- Once the converter project is generated, we can iterate on any Safari-specific manifest or code adjustments inside this folder.
