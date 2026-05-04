// WebExtensions namespace shim for Safari.
// Safari may expose `browser` instead of `chrome` in some contexts.
// Ensure both exist to keep the rest of the codebase unchanged.
(() => {
  if (typeof globalThis.chrome === "undefined" && typeof globalThis.browser !== "undefined") {
    globalThis.chrome = globalThis.browser;
  }
  if (typeof globalThis.browser === "undefined" && typeof globalThis.chrome !== "undefined") {
    globalThis.browser = globalThis.chrome;
  }
})();
