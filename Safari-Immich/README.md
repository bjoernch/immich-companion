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

# Safari build instructions (Xcode)

You need to have Xcode installed. First thing to do was to create a development account with Apple (the free version).

Then open the "Immich Companion.xcodeproj"  file in Xcode. After that, select the **Immich Companion** project → **Build Settings** 

![Screenshot 2026-05-04 at 11.20.43](<Safari Build Instructions pics/Screenshot 2026-05-04 at 11.20.43.png>)

and ensure **Development Team** has your account selected (you'll have to add your account in **Xcode → Settings → Accounts** if you haven't done so already). Select your development team.

![Screenshot 2026-05-04 at 11.22.32](<Safari Build Instructions pics/Screenshot 2026-05-04 at 11.22.32.png>)

Next, ensure **Automatically manage signing** is enabled for all **TARGETS** listed.

![Screenshot 2026-05-04 at 11.23.58](<Safari Build Instructions pics/Screenshot 2026-05-04 at 11.23.58.png>)

Then, go to **Product → Archive** and wait until the project compiles. It will bring up the Archive window.

![Screenshot 2026-05-04 at 11.25.16](<Safari Build Instructions pics/Screenshot 2026-05-04 at 11.25.16.png>)

![Screenshot 2026-05-04 at 11.28.33](<Safari Build Instructions pics/Screenshot 2026-05-04 at 11.28.33.png>)

Next, hit **Distribute App → Custom → Copy App** and choose where to export the app.

![Screenshot 2026-05-04 at 11.29.32](<Safari Build Instructions pics/Screenshot 2026-05-04 at 11.29.32.png>)

![Screenshot 2026-05-04 at 11.30.34](<Safari Build Instructions pics/Screenshot 2026-05-04 at 11.30.34.png>)

![Screenshot 2026-05-04 at 11.32.18](<Safari Build Instructions pics/Screenshot 2026-05-04 at 11.32.18.png>)

![Screenshot 2026-05-04 at 11.33.31](<Safari Build Instructions pics/Screenshot 2026-05-04 at 11.33.31.png>)

After running the app, the extension will be available in Safari, even after restarting the browser.

That's it! Be aware that if you delete your app, it will also delete your extensions, so it's advised to move the app to your Applications folder.
