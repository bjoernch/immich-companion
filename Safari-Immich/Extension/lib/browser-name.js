// Replaces [data-browser] and [data-extensions-url] placeholders with the
// host-browser-specific text. Imported by every page that uses those
// placeholders.

const ua = navigator.userAgent || "";
const isFirefox = ua.toLowerCase().includes("firefox");
const isSafari =
  /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Brave|FxiOS/i.test(ua);

export const browserName = isFirefox
  ? "Firefox"
  : isSafari
    ? "Safari"
    : "Chrome";
export const extensionsUrl = isFirefox
  ? "about:addons"
  : isSafari
    ? "Safari → Settings → Extensions"
    : "chrome://extensions";

// Cheap macOS detection. Prefers the modern userAgentData when available
// (Chromium-only), falls back to the legacy userAgent string otherwise
// (covers Firefox + Safari). Used to gate Apple-Maps-only features.
export const isMacOS = (() => {
  try {
    const uaPlatform = navigator.userAgentData?.platform;
    if (uaPlatform) return uaPlatform === "macOS";
  } catch {}
  return /\bMac OS X\b|\bMacintosh\b/.test(navigator.userAgent || "");
})();

export function applyBrowserPlaceholders(root = document) {
  for (const el of root.querySelectorAll("[data-browser]")) {
    el.textContent = browserName;
  }
  for (const el of root.querySelectorAll("[data-extensions-url]")) {
    el.textContent = extensionsUrl;
  }
}
