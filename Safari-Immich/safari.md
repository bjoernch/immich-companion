# Safari build instructions (Xcode)

You need to have Xcode installed. First thing to do was to create a development account with Apple (the free version).

Then open the "Immich Companion.xcodeproj"  file in Xcode. After that, select the **Immich Companion** project → **Build Settings** 



and ensure **Development Team** has your account selected (you'll have to add your account in **Xcode → Settings → Accounts** if you haven't done so already). Select your development team.



Next, ensure **Automatically manage signing** is enabled for all **TARGETS** listed.



Then, go to **Product → Archive** and wait until the project compiles. It will bring up the Archive window.





Next, hit **Distribute App → Custom → Copy App** and choose where to export the app.









After running the app, the extension will be available in Safari, even after restarting the browser.

That's it! Be aware that if you delete your app, it will also delete your extensions, so it's advised to move the app to your Applications folder.
