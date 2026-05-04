# Safari build instructions (Xcode)

You need to have Xcode installed. First thing to do was to create a development account with Apple (the free version).

Then open the "Immich Companion.xcodeproj"  file in Xcode. After that, select the **Immich Companion** project → **Build Settings** 

![[Screenshot 2026-05-04 at 11.20.43.png]]


and ensure **Development Team** has your account selected (you'll have to add your account in **Xcode → Settings → Accounts** if you haven't done so already). Select your development team.

![[Screenshot 2026-05-04 at 11.22.32.png]]

Next, ensure **Automatically manage signing** is enabled for all **TARGETS** listed.

![[Screenshot 2026-05-04 at 11.23.58.png]]

Then, go to **Product → Archive** and wait until the project compiles. It will bring up the Archive window.

![[Screenshot 2026-05-04 at 11.25.16.png]]

![[Screenshot 2026-05-04 at 11.28.33.png]]

Next, hit **Distribute App → Custom → Copy App** and choose where to export the app.

![[Screenshot 2026-05-04 at 11.29.32.png]]

![[Screenshot 2026-05-04 at 11.30.34.png]]

![[Screenshot 2026-05-04 at 11.32.18.png]]

![[Screenshot 2026-05-04 at 11.33.31.png]]

After running the app, the extension will be available in Safari, even after restarting the browser.

That's it! Be aware that if you delete your app, it will also delete your extensions, so it's advised to move the app to your Applications folder.
