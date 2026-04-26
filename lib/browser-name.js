// Replaces [data-browser] and [data-extensions-url] placeholders with the
// host-browser-specific text. Imported by every page that uses those
// placeholders.

const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");

export const browserName = isFirefox ? "Firefox" : "Chrome";
export const extensionsUrl = isFirefox ? "about:addons" : "chrome://extensions";

export function applyBrowserPlaceholders(root = document) {
  for (const el of root.querySelectorAll("[data-browser]")) {
    el.textContent = browserName;
  }
  for (const el of root.querySelectorAll("[data-extensions-url]")) {
    el.textContent = extensionsUrl;
  }
}
