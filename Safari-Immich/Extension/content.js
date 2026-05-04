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
      const icon = document.createElement("div"); icon.className = "icon";
      const body = document.createElement("div"); body.className = "body";
      const titleEl = document.createElement("div"); titleEl.className = "title";
      const msgEl = document.createElement("div"); msgEl.className = "msg";
      const actionsEl = document.createElement("div"); actionsEl.className = "actions";
      body.append(titleEl, msgEl, actionsEl);
      const close = document.createElement("button");
      close.type = "button";
      close.className = "close";
      close.setAttribute("aria-label", "Dismiss");
      close.textContent = "×";
      el.append(icon, body, close);
      host.appendChild(el);
      requestAnimationFrame(() => el.classList.add("show"));
      close.addEventListener("click", () => dismiss(id));
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
    actions.replaceChildren();
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
    if (msg?.type === "fetch-blob" && msg.url) {
      // The background SW can't resolve blob: URLs (they're scoped to the
      // page that created them). Fetch in the content script instead and
      // ship the bytes back.
      fetch(msg.url)
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const buf = await r.arrayBuffer();
          sendResponse({
            ok: true,
            contentType: r.headers.get("content-type") || "application/octet-stream",
            data: Array.from(new Uint8Array(buf)),
          });
        })
        .catch((e) => sendResponse({ ok: false, error: e.message || String(e) }));
      return true; // async
    }
    if (msg?.type === "fetch-in-page" && msg.url) {
      // Fallback path for cross-origin CDN fetches that the background SW
      // can't make (e.g. cdninstagram.com requires the page's Referer +
      // cookies). The content script runs in the page's origin so this
      // request automatically carries them.
      fetch(msg.url, { credentials: "include" })
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const buf = await r.arrayBuffer();
          sendResponse({
            ok: true,
            contentType: r.headers.get("content-type") || "application/octet-stream",
            data: Array.from(new Uint8Array(buf)),
          });
        })
        .catch((e) => sendResponse({ ok: false, error: e.message || String(e) }));
      return true; // async
    }
    return false;
  });

  // ----- Google inline results --------------------------------------------
  // Runs only on google.<tld>/search pages. Pulls the user's query, runs CLIP
  // smart-search against the configured Immich server, and injects a card at
  // the top of the results column when there are matches.
  const TAG = "[immich-companion]";
  const isGoogleSearch =
    /^(www\.)?google\.[a-z.]{2,}$/.test(location.host) &&
    location.pathname === "/search";
  if (isGoogleSearch) {
    console.debug(TAG, "Google search detected, host=", location.host);
    initGoogleInline().catch((e) => console.warn(TAG, "init failed", e));
  }

  async function initGoogleInline() {
    const params = new URLSearchParams(location.search);
    const q = (params.get("q") || "").trim();
    if (q.length < 2) {
      console.debug(TAG, "skip: query too short");
      return;
    }
    if (params.get("tbm")) {
      console.debug(TAG, "skip: not the All tab (tbm=" + params.get("tbm") + ")");
      return;
    }

    const stored = await chrome.storage.local.get([
      "serverUrl", "apiKey", "featureGoogleInline",
    ]);
    if (!stored.serverUrl || !stored.apiKey) {
      console.debug(TAG, "skip: not configured", {
        hasUrl: Boolean(stored.serverUrl),
        hasKey: Boolean(stored.apiKey),
      });
      return;
    }
    if (stored.featureGoogleInline === false) {
      console.debug(TAG, "skip: featureGoogleInline=false");
      return;
    }

    const serverUrl = stored.serverUrl.replace(/\/+$/, "");
    console.debug(TAG, "querying Immich for:", q);
    let items = [];
    try {
      // Route through the background service worker — it has the host
      // permissions and isn't subject to the host page's mixed-content / CORS
      // rules. The API key never leaves the background context.
      const res = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "smart-search", query: q, size: 10 },
          (r) => {
            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
            if (!r?.ok) return reject(new Error(r?.error || "no response"));
            resolve(r);
          },
        );
      });
      items = res.data?.assets?.items || [];
      console.debug(TAG, `got ${items.length} match(es)`);
    } catch (e) {
      console.warn(TAG, "search via background failed:", e.message || e);
      return;
    }
    if (!items.length) {
      console.debug(TAG, "no matches, not injecting");
      return;
    }
    await waitForResults();
    const ok = injectImmichCard(items, serverUrl, q);
    console.debug(TAG, ok ? "card injected" : "no insertion target found");
  }

  function waitForResults() {
    return new Promise((resolve) => {
      if (document.querySelector("#rso, #search, #center_col")) return resolve();
      const obs = new MutationObserver(() => {
        if (document.querySelector("#rso, #search, #center_col")) {
          obs.disconnect();
          resolve();
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); resolve(); }, 4000);
    });
  }

  function injectImmichCard(items, serverUrl, query) {
    if (document.getElementById("immich-companion-google-card")) return true;
    // Try several insertion points. Different Google layouts and locales use
    // different containers; the first hit wins.
    const selectors = [
      "#rso",
      "#search",
      "#center_col",
      "#main",
      "[role='main']",
    ];
    let target = null;
    for (const sel of selectors) {
      target = document.querySelector(sel);
      if (target) {
        console.debug(TAG, "insertion target:", sel);
        break;
      }
    }
    if (!target) return false;

    const card = document.createElement("div");
    card.id = "immich-companion-google-card";
    card.className = "immich-companion-google-card";

    const header = document.createElement("div");
    header.className = "icc-header";
    const brand = document.createElement("div");
    brand.className = "icc-brand";
    const logo = document.createElement("img");
    logo.src = chrome.runtime.getURL("icons/icon-48.png");
    logo.alt = "";
    const label = document.createElement("span");
    label.className = "icc-label";
    label.textContent = "From your Immich library";
    const count = document.createElement("span");
    count.className = "icc-count";
    count.textContent = `${items.length} match${items.length === 1 ? "" : "es"}`;
    brand.appendChild(logo);
    brand.appendChild(label);
    brand.appendChild(count);
    header.appendChild(brand);

    const viewAll = document.createElement("a");
    viewAll.className = "icc-view-all";
    viewAll.href = `${serverUrl}/search?query=${encodeURIComponent(JSON.stringify({ query }))}`;
    viewAll.target = "_blank";
    viewAll.rel = "noopener";
    viewAll.textContent = "View all in Immich →";
    header.appendChild(viewAll);

    card.appendChild(header);

    const strip = document.createElement("div");
    strip.className = "icc-strip";
    for (const a of items) {
      const link = document.createElement("a");
      link.className = "icc-item";
      link.href = `${serverUrl}/photos/${a.id}`;
      link.target = "_blank";
      link.rel = "noopener";
      link.title = a.originalFileName || a.id;
      const img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      link.appendChild(img);
      strip.appendChild(link);

      // Authenticated thumbnail via background (img tags can't send the
      // x-api-key header). Background returns bytes; we make a blob URL.
      chrome.runtime.sendMessage(
        { type: "thumb", assetId: a.id, size: "thumbnail" },
        (res) => {
          if (chrome.runtime.lastError) return;
          if (!res?.ok) return;
          try {
            const blob = new Blob([new Uint8Array(res.data)], {
              type: res.contentType || "image/jpeg",
            });
            img.src = URL.createObjectURL(blob);
          } catch {}
        },
      );
    }
    card.appendChild(strip);

    target.insertBefore(card, target.firstChild);
    return true;
  }

  // ----- Share toolbar ----------------------------------------------------
  const { serverUrl, sharePathHosts, featureShareToolbar } =
    await chrome.storage.local.get([
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
