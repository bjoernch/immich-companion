# Development notes

Internal notes for building, releasing, and publishing Immich Companion. Not user-facing.

## Project layout

```
manifest.json            MV3 manifest
background.js            service worker — context menus, alarms, badge,
                         message proxy for content scripts
content.js / content.css runs on every page — toast UI, share-album toolbar,
                         Google search-result card injection
lib/immich.js            REST client + storage helpers
pages/
  options.html / .js     full-page options with sidebar nav
  popup.html / .js       toolbar popup (Search / Recent / Upload tabs)
  newtab.html / .js      new-tab override
  welcome.html / .js     first-run onboarding
  shared.css             theme + components
icons/                   PNGs + the Pillow generator
webstore-assets/         promo tiles, banner, screenshot template, generator
```

All settings live in `chrome.storage.local` under the keys defined in `DEFAULTS` at the top of `lib/immich.js`. Old installs that wrote to `chrome.storage.sync` are migrated automatically on the first call to `getConfig()`.

## Loading the unpacked extension

```
chrome://extensions → Developer mode → Load unpacked → pick the repo root
```

No build step needed for development. Edit, click the refresh icon on the extension card.

## Building a submission zip

```
./build.sh
```

Writes `dist/immich-companion-<version>.zip` containing only runtime files (manifest, JS, CSS, HTML, icon PNGs, LICENSE). Excluded: `.git`, dev markdown, the `webstore-assets/` folder, Python tooling, `__pycache__`, `.DS_Store`.

## Releases

Tag matching the manifest version:

```
git tag v$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
git push --tags
```

The GitHub Action in `.github/workflows/release.yml` builds the zip, attaches it to a GitHub Release, and (if the secrets below are set) publishes to the Chrome Web Store.

## Optional Web Store auto-publish

Repo secrets to set:

| Secret                     | Where it comes from                                                       |
| -------------------------- | ------------------------------------------------------------------------- |
| `WEBSTORE_EXTENSION_ID`    | shown in the Web Store dashboard after the first manual upload            |
| `WEBSTORE_CLIENT_ID`       | Google Cloud OAuth 2.0 client ID for a "desktop" application              |
| `WEBSTORE_CLIENT_SECRET`   | matching client secret                                                    |
| `WEBSTORE_REFRESH_TOKEN`   | obtained via a one-time OAuth dance — see Google's guide below            |

Step-by-step: <https://developer.chrome.com/docs/webstore/using-api>.

The first version still has to be uploaded manually so listing fields, screenshots, and the privacy policy URL can be filled in. Automation handles updates.

## Regenerating images

Both Pillow-based:

```
python3 icons/make_icons.py            # icon-16/48/128.png
python3 webstore-assets/make_assets.py # promo tiles, banner, screenshot template
```

## Listing copy

`STORE_LISTING.md` contains ready-to-paste copy for every field of the Web Store dashboard (item name, summary, description, single-purpose statement, per-permission justifications) and three options for hosting the privacy policy URL the Store requires.
