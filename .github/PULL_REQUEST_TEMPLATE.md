<!--
Thanks for contributing! A few quick prompts so the diff lands cleanly.
-->

## What

Short description of the change.

## Why

What problem this solves, or which issue / discussion it addresses (use `Closes #N` if applicable).

## How

Brief walkthrough of the approach. Call out anything subtle: a CSS specificity gotcha, an Immich API version dependency, browser-specific behaviour (Chrome vs. Firefox), etc.

## Test plan

How you verified this works. At minimum:

- [ ] Loaded the unpacked extension in Chrome (`chrome://extensions` → Load unpacked) and exercised the affected feature
- [ ] Loaded the unpacked extension in Firefox (`about:debugging` → Load Temporary Add-on) — only required for changes that touch the manifest, background script, or content scripts
- [ ] No new console errors on the popup, options page, or new tab
- [ ] If touched: settings persist after reloading the extension

## Screenshots / GIFs

For UI changes, drop a before/after image here.

## Notes for the reviewer

Anything you want me to look at first, or anything you're unsure about.
