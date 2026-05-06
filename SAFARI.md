# Safari (macOS) — install and build

> **Status:** experimental. The core flows (popup search, options, in-page toasts) work; some features (right-click *Save to Immich*, share-link toast, scheduled connection ping) are likely broken because Safari doesn't support `background.type: "module"` or the `notifications` permission. See *Known limitations* below.

Initial Safari support was contributed by [@Tekkiech](https://github.com/Tekkiech) in [PR #5](https://github.com/bjoernch/immich-companion/pull/5). Rather than committing a duplicated copy of the extension source under a `Safari-Immich/` folder (which would silently drift from the Chrome/Firefox sources every release), the release workflow now generates a fresh Safari Xcode project from the same `dist/immich-companion-chrome-<version>.zip` that ships to the Chrome Web Store.

The deliverable is the **Xcode project**, not a built `.app`. Apple won't let an unsigned `.app` register a Safari extension, and signing for distribution requires a paid Apple Developer Program membership ($99/year). Each user signs the project with their own free Apple ID and runs it locally instead.

---

## Install — step by step

### 1. Download the project zip

From the [latest release](https://github.com/bjoernch/immich-companion/releases/latest), download `immich-companion-safari-<version>.zip`. Unzip anywhere (Desktop is fine).

You'll get a folder containing `Immich Companion.xcodeproj` plus the supporting Swift / resource files.

### 2. Open in Xcode

Double-click `Immich Companion.xcodeproj`. Requires Xcode 15 or newer (free from the Mac App Store).

### 3. Sign in with your Apple ID (one time)

Skip if you've already used Xcode for development on this Mac.

- Top menu bar: **Xcode** → **Settings…** (or `⌘,`).
- **Accounts** tab → click the **+** at the bottom-left → **Apple ID**.
- Enter your iCloud email and password.
- Close the Settings window.

Free accounts are fine — no $99 Developer Program membership is required for local installs.

### 4. Set the team and bundle ID for both targets

- Click the blue **Immich Companion** project icon in the Xcode left sidebar.
- Under **TARGETS** in the middle pane, you'll see two targets:
  - **Immich Companion** (the macOS wrapper app)
  - **Immich Companion Extension** (the Safari Web Extension)

For **each** target:

- Click the target → **Signing & Capabilities** tab.
- **Team**: pick your *"\<Your Name> (Personal Team)"*.
- **Bundle Identifier**: change it to something unique to you. The default `dev.bjoernch.immich-companion` is already claimed in Apple's developer console by the project maintainer; pick e.g. `com.<yourname>.immich-companion` for the app target.
- **Important**: the extension's bundle ID must be **exactly** the app's bundle ID + `.Extension`. So if you set the app to `com.<yourname>.immich-companion`, the extension must be `com.<yourname>.immich-companion.Extension`. Apple rejects the build with *"Embedded binary's bundle identifier is not prefixed with the parent app's bundle identifier"* otherwise. Case-sensitive — keep both lowercase.

### 5. Build and run

- Top-left of the Xcode window: scheme dropdown should say **Immich Companion**, destination should be **My Mac**.
- Click the ▶ Play button (or `⌘R`).

After ~10 seconds the wrapper app opens with a small window saying *"You can turn on Immich Companion's extension in Safari Extensions preferences."*

### 6. Enable in Safari

1. Click **Quit and Open Safari Extension Preferences** in the wrapper window. Safari opens the **Settings → Extensions** pane.
2. Tick the **Immich Companion** entry.
3. Click **Edit Websites…** → scroll to the bottom → set **All Websites** to **Allow**.
4. The extension's icon now appears in Safari's toolbar (might be tucked under the **»** overflow — drag it visible via *View → Customize Toolbar*).
5. Click the icon to open the popup. Configure your Immich server URL + API key as you would on Chrome / Firefox.

### One-time gotcha: "Allow Unsigned Extensions"

If Safari refuses to load the extension and you don't see it in the Extensions list at all:

- Safari → **Settings…** → **Advanced** → tick **"Show features for web developers"**.
- Then in Safari's menu bar: **Develop** → **Web Extension** → **Allow Unsigned Extensions** → enter your password.

Apple resets *Allow Unsigned Extensions* every Safari restart while your extension is signed only with a free Apple ID. There's no fix from inside the extension itself.

**There is, however, a one-Mac workaround** that survives Safari restarts and the 24-hour Apple-ID re-trust window: generate a **self-signed code-signing certificate** in Keychain Access, mark it trusted on your own machine, and build the Xcode project with that certificate as the Signing Identity. Safari treats the resulting `.app` like a properly-signed extension and stops re-prompting. Full step-by-step on Stack Overflow: [How can I sign a Safari extension for just one computer?](https://stackoverflow.com/questions/62748163/how-can-i-sign-a-safari-extension-for-just-one-computer/62748969#62748969). Credit to [@Tekkiech](https://github.com/Tekkiech) for surfacing this in [issue #6](https://github.com/bjoernch/immich-companion/issues/6).

Caveats — same limitations as any self-signed setup:

- The trust is **per-Mac**. Other people who download your built `.app` from elsewhere will hit a "developer cannot be verified" warning unless they import the same cert and trust it (which is itself an unwise thing to ask anyone to do).
- It does **not** replace the need for proper signing if you ever want to distribute the extension to other people. For that the only real path is the paid Developer Program ($99/year) and Apple notarisation.
- If you ever delete the certificate from Keychain or change its trust settings, Safari starts re-prompting again.

For a single-Mac local install where you just want the extension to keep working across Safari restarts, this is the cleanest option short of paying Apple.

---

## Known limitations on Safari

Apple's converter prints these warnings, all of which apply at runtime:

| Manifest key | Safari support | Practical impact |
|---|---|---|
| `background.type: "module"` | Not supported | The background script's ES `import` statements fail. Anything triggered from the background — right-click *Save to Immich*, share-link toast, periodic connection ping, the Google-search inline card content-script bridge — will likely silently fail until we bundle imports into a single non-module `background.js`. |
| `options_ui.open_in_tab` | Ignored | The Settings page opens embedded in the wrapper app's window instead of in a Safari tab. Cosmetic; everything still works there. |
| `notifications` permission | Not supported | The optional desktop-notification feature on upload completion is silently disabled. The in-page toast still fires (different code path). |
| `chrome.downloads.download()` (Firefox-only path) | Not used in Safari build | Safari builds don't include the `downloads` permission anyway. The popup-side `<a download>.click()` works in Safari. |

What **does** work without changes:

- Toolbar popup: search, gallery, filter pills, video preview (inline + popup window), Maps quick-action, About-section bug-report flow, update banner.
- Settings (options) page: full functionality.
- Right-click → *Save to Immich* on a normal blog/news image where the source URL is plain `https://…/foo.jpg`. Will fail on blob: URLs and login-walled CDNs because the page-context fetch fallback relies on the `chrome.tabs.sendMessage` content-script bridge, which the Safari background can't reach until imports are bundled.

---

## Why we don't ship a pre-built `.app`

Three reasons, in increasing order of difficulty:

1. **macOS gatekeeper** — an unsigned `.app` distributed via GitHub is quarantined when downloaded; Safari refuses to register its extension.
2. **Notarization** — even with a paid Apple Developer ID signing certificate, distributing outside the App Store requires Apple to *notarize* every release build, which is an extra automated submission step that takes 5–30 minutes per upload.
3. **Mac App Store** — the only fully friction-free distribution channel. Costs $99/year and adds a human review per release.

Until the project funds either of #2 or #3, the Xcode-project-zip workflow above is the closest thing to a one-click install Safari supports.

---

## Roadmap

- **Bundle the background module**: combine `lib/immich.js` + `lib/browser-name.js` + `background.js` into a single non-module file at build time, fixing the *Save to Immich* / share-link / ping flows on Safari.
- **Optional**: explore whether running the Mac App Store submission is worth the $99/year for a small project.
- **Document** any further compatibility shims discovered during real Safari use.

---

## Credits

- [@Tekkiech](https://github.com/Tekkiech) — initial Safari port and the working Xcode project layout that the converter reproduces. ([PR #5](https://github.com/bjoernch/immich-companion/pull/5))
