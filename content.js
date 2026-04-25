// Content script: runs on all pages, hosts in-page toast UI plus the
// share-album toolbar (only on configured Immich share URLs).

(async () => {
  if (window.__immichCompanionLoaded) return;
  window.__immichCompanionLoaded = true;

  // ----- Toast UI ---------------------------------------------------------
  const TOAST_HOST_ID = "immich-companion-toasts";
  const toasts = new Map(); // id -> { el, timer }

  function ensureHost() {
    let host = document.getElementById(TOAST_HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = TOAST_HOST_ID;
      host.className = "immich-companion-toasts";
      (document.body || document.documentElement).appendChild(host);
    }
    return host;
  }

  function iconFor(kind) {
    return kind === "success" ? "✓" : kind === "error" ? "!" : "…";
  }

  function showToast({ id, kind = "info", title, message, sticky = false, duration, link }) {
    const host = ensureHost();
    let entry = toasts.get(id);

    if (!entry) {
      const el = document.createElement("div");
      el.className = `immich-companion-toast ${kind}`;
      el.innerHTML = `
        <div class="icon"></div>
        <div class="body">
          <div class="title"></div>
          <div class="msg"></div>
          <div class="actions"></div>
        </div>
        <button class="close" type="button" aria-label="Dismiss">×</button>
      `;
      host.appendChild(el);
      requestAnimationFrame(() => el.classList.add("show"));
      el.querySelector(".close").addEventListener("click", () => dismiss(id));
      entry = { el };
      toasts.set(id, entry);
    }

    const { el } = entry;
    el.classList.remove("info", "success", "error");
    el.classList.add(kind);
    el.querySelector(".icon").textContent = iconFor(kind);
    el.querySelector(".title").textContent = title || "";
    el.querySelector(".msg").textContent = message || "";

    const actions = el.querySelector(".actions");
    actions.innerHTML = "";
    if (link?.url) {
      const open = document.createElement("a");
      open.className = "tact";
      open.textContent = "Open";
      open.href = link.url;
      open.target = "_blank";
      open.rel = "noopener";
      actions.appendChild(open);

      if (link.copy !== false) {
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "tact";
        copyBtn.textContent = "Copy link";
        copyBtn.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(link.url);
            copyBtn.textContent = "Copied ✓";
            setTimeout(() => (copyBtn.textContent = "Copy link"), 1200);
          } catch {}
        });
        actions.appendChild(copyBtn);
      }
    }

    let progress = el.querySelector(".progress");
    if (kind === "info" && sticky) {
      if (!progress) {
        progress = document.createElement("div");
        progress.className = "progress";
        el.appendChild(progress);
      }
    } else if (progress) {
      progress.remove();
    }

    if (entry.timer) clearTimeout(entry.timer);
    if (!sticky) {
      const ms = duration ?? (kind === "error" ? 6000 : link?.url ? 8000 : 3500);
      entry.timer = setTimeout(() => dismiss(id), ms);
    }
  }

  function dismiss(id) {
    const entry = toasts.get(id);
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    entry.el.classList.remove("show");
    setTimeout(() => entry.el.remove(), 240);
    toasts.delete(id);
  }

  async function copyToClipboard(text) {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for tabs without clipboard permission/activation.
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "toast") {
      showToast(msg);
      sendResponse({ ok: true });
      return false;
    }
    if (msg?.type === "toast-dismiss" && msg.id) {
      dismiss(msg.id);
      sendResponse({ ok: true });
      return false;
    }
    if (msg?.type === "copy-to-clipboard") {
      copyToClipboard(msg.text).then((ok) => sendResponse({ ok }));
      return true; // async
    }
    return false;
  });

  // ----- Share toolbar ----------------------------------------------------
  const { serverUrl, sharePathHosts, featureShareToolbar } =
    await chrome.storage.sync.get([
      "serverUrl",
      "sharePathHosts",
      "featureShareToolbar",
    ]);

  if (!serverUrl) return;
  if (featureShareToolbar === false) return;

  const allowedHosts = new Set();
  try { allowedHosts.add(new URL(serverUrl).host); } catch {}
  if (sharePathHosts) {
    sharePathHosts.split(",").map((h) => h.trim()).filter(Boolean)
      .forEach((h) => allowedHosts.add(h));
  }

  if (!allowedHosts.has(location.host)) return;
  if (!/\/share(\/|$)/.test(location.pathname)) return;

  injectToolbar();

  function injectToolbar() {
    if (document.querySelector(".immich-companion-toolbar")) return;
    const bar = document.createElement("div");
    bar.className = "immich-companion-toolbar";

    const slide = document.createElement("button");
    slide.textContent = "▶ Slideshow";
    slide.addEventListener("click", startSlideshow);

    const dl = document.createElement("button");
    dl.textContent = "⤓ Download all";
    dl.addEventListener("click", downloadAll);

    bar.appendChild(slide);
    bar.appendChild(dl);
    document.documentElement.appendChild(bar);
  }

  function collectImages() {
    return Array.from(document.querySelectorAll("img"))
      .map((img) => img.currentSrc || img.src)
      .filter((u) => u && /\/api\/(assets|asset)\//.test(u));
  }

  function startSlideshow() {
    const urls = collectImages();
    if (!urls.length) return alert("No images found on this share yet — scroll to load them first.");
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:#000;z-index:2147483647;display:grid;place-items:center;";
    const img = document.createElement("img");
    img.style.cssText = "max-width:100vw;max-height:100vh;object-fit:contain;";
    overlay.appendChild(img);
    document.documentElement.appendChild(overlay);
    let i = 0;
    img.src = urls[0];
    const tick = setInterval(() => {
      i = (i + 1) % urls.length;
      img.src = urls[i];
    }, 4000);
    const stop = (e) => {
      if (e.type === "keydown" && e.key !== "Escape") return;
      clearInterval(tick);
      overlay.remove();
      window.removeEventListener("keydown", stop);
    };
    overlay.addEventListener("click", stop);
    window.addEventListener("keydown", stop);
  }

  async function downloadAll() {
    const m = location.pathname.match(/\/share\/([^/?#]+)/);
    if (!m) return alert("Couldn't read share key from URL.");
    const key = m[1];
    let assets = [];
    try {
      const res = await fetch(`/api/shared-links/me?key=${encodeURIComponent(key)}`);
      if (res.ok) {
        const json = await res.json();
        assets = json?.assets || [];
      }
    } catch {}
    if (!assets.length) {
      const urls = collectImages();
      if (!urls.length) return alert("No assets found.");
      urls.forEach((u, i) => triggerDownload(u, `share-${i}.jpg`));
      return;
    }
    for (const a of assets) {
      const url = `/api/assets/${a.id}/original?key=${encodeURIComponent(key)}`;
      triggerDownload(url, a.originalFileName || `${a.id}`);
    }
  }

  function triggerDownload(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 500);
  }
})();
