import {
  getConfig,
  isConfigured,
  randomAssets,
  onThisDay,
  viewUrl,
  ping,
} from "../lib/immich.js";

const VERSION_TAG = "diag-v3";

const $ = (id) => document.getElementById(id);

function fmtClock(d) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}
function fmtDate(d) {
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function tickClock() {
  $("clock").textContent = fmtClock(new Date());
}
setInterval(tickClock, 1000);
tickClock();

async function loadThumbViaBg(assetId, size = "preview") {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "thumb", assetId, size }, (res) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!res?.ok) return reject(new Error(res?.error || `status ${res?.status}`));
      const blob = new Blob([new Uint8Array(res.data)], { type: res.contentType || "image/jpeg" });
      resolve(URL.createObjectURL(blob));
    });
  });
}

function showToast(msg, link) {
  const t = $("toast");
  t.replaceChildren();
  t.appendChild(document.createTextNode(msg));
  if (link) {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = link.label;
    a.addEventListener("click", (e) => { e.preventDefault(); link.onClick(); });
    t.appendChild(a);
  }
  t.hidden = false;
}

let rotateTimer;

async function pickAndRender(cfg) {
  const items = await randomAssets({ count: 1, albumId: cfg.newtabAlbumId || "" });
  const asset = Array.isArray(items) ? items[0] : items?.assets?.items?.[0];
  if (!asset) {
    if (cfg.newtabAlbumId) {
      showToast("Selected album has no photos.", {
        label: "Change album",
        onClick: () => chrome.runtime.openOptionsPage(),
      });
    }
    return;
  }

  // /search/random is lightweight — Immich often returns a thin asset
  // record without exifInfo. Fetch the full asset detail so the photo
  // metadata block in the corner has something to show.
  if (cfg.newtabShowMetadata !== false) {
    const exif = asset.exifInfo;
    const sparse = !exif || Object.keys(exif).length === 0 ||
      (!exif.make && !exif.model && !exif.iso && !exif.fNumber);
    if (sparse) {
      try {
        const detail = await fetchAssetDetail(cfg, asset.id);
        if (detail) Object.assign(asset, detail);
      } catch {}
    }
  }

  const url = await loadThumbViaBg(asset.id, "preview");
  const bg = $("bg");
  bg.style.opacity = "0";
  setTimeout(() => {
    bg.style.backgroundImage = `url("${url}")`;
    bg.style.opacity = "1";
  }, 50);

  const exif = asset.exifInfo || {};
  const date = exif.dateTimeOriginal || asset.fileCreatedAt;
  const place = [exif.city, exif.country].filter(Boolean).join(", ");
  const meta = $("meta");
  meta.replaceChildren();

  const dateEl = document.createElement("div");
  dateEl.textContent = fmtDate(new Date());
  dateEl.style.fontWeight = "500";
  meta.appendChild(dateEl);

  if (date || place) {
    const sub = document.createElement("div");
    const parts = [];
    if (date) parts.push(new Date(date).toLocaleDateString());
    if (place) parts.push(place);
    sub.textContent = parts.join(" · ");
    sub.style.opacity = "0.85";
    meta.appendChild(sub);
  }

  if (cfg.newtabShowMetadata !== false) {
    const lines = buildExifLines(exif);
    for (const line of lines) {
      const el = document.createElement("div");
      el.className = "meta-detail";
      el.textContent = line;
      meta.appendChild(el);
    }
  }

  const link = document.createElement("a");
  link.href = viewUrl(cfg.serverUrl, asset.id);
  link.textContent = "Open in Immich →";
  link.target = "_blank";
  link.rel = "noopener";
  meta.appendChild(link);
}

async function fetchAssetDetail(cfg, assetId) {
  const res = await fetch(`${cfg.serverUrl}/api/assets/${assetId}`, {
    headers: { "x-api-key": cfg.apiKey },
  });
  if (!res.ok) return null;
  return res.json();
}

function buildExifLines(exif) {
  const lines = [];
  // Camera + lens
  const cam = [exif.make, exif.model].filter(Boolean).join(" ").trim();
  if (cam) lines.push(cam);
  if (exif.lensModel && exif.lensModel !== cam) lines.push(exif.lensModel);

  // Exposure
  const settings = [];
  if (exif.iso) settings.push(`ISO ${exif.iso}`);
  if (exif.fNumber) settings.push(`f/${exif.fNumber}`);
  if (exif.exposureTime) settings.push(`${exif.exposureTime}s`);
  if (exif.focalLength) settings.push(`${Math.round(exif.focalLength)}mm`);
  if (settings.length) lines.push(settings.join(" · "));

  // Dimensions + file size
  const dimsParts = [];
  if (exif.exifImageWidth && exif.exifImageHeight) {
    dimsParts.push(`${exif.exifImageWidth} × ${exif.exifImageHeight}`);
  } else if (exif.imageWidth && exif.imageHeight) {
    dimsParts.push(`${exif.imageWidth} × ${exif.imageHeight}`);
  }
  if (exif.fileSizeInByte) dimsParts.push(formatBytes(exif.fileSizeInByte));
  if (dimsParts.length) lines.push(dimsParts.join(" · "));

  return lines;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// Same heuristic as the popup: timeouts, generic network errors, 5xx server
// responses. Triggers the dedicated overlay instead of a tiny pill toast.
function isConnectionError(e) {
  if (!e) return false;
  if (e.name === "AbortError") return true;
  if (e instanceof TypeError) return true;
  const m = e.message || "";
  if (/timed out|unreachable/i.test(m)) return true;
  if (/Failed to fetch|NetworkError|net::ERR_/i.test(m)) return true;
  if (/failed: 5\d\d/.test(m)) return true;
  return false;
}

function showConnectionErrorOverlay(cfg, error) {
  const overlay = $("connError");
  if (!overlay) return;
  $("connErrorDetail").textContent = error?.message || "Unknown error.";
  let host = "";
  try { if (cfg?.serverUrl) host = new URL(cfg.serverUrl).host; } catch {}
  $("connErrorHost").textContent = host;
  $("connErrorHost").hidden = !host;
  overlay.hidden = false;
}

function hideConnectionErrorOverlay() {
  const overlay = $("connError");
  if (overlay) overlay.hidden = true;
}

async function loadBackground(cfg) {
  try {
    await pickAndRender(cfg);
    hideConnectionErrorOverlay();
  } catch (e) {
    if (isConnectionError(e)) {
      showConnectionErrorOverlay(cfg, e);
    } else {
      showToast(`Background failed: ${e.message}`, {
        label: "Settings",
        onClick: () => chrome.runtime.openOptionsPage(),
      });
    }
  }
  if (cfg.newtabRotateSeconds && cfg.newtabRotateSeconds > 0) {
    clearInterval(rotateTimer);
    rotateTimer = setInterval(() => {
      pickAndRender(cfg)
        .then(hideConnectionErrorOverlay)
        .catch((e) => {
          if (isConnectionError(e)) showConnectionErrorOverlay(cfg, e);
        });
    }, cfg.newtabRotateSeconds * 1000);
  }
}

async function loadOnThisDayStrip(cfg) {
  try {
    const groups = await onThisDay(new Date(), cfg.newtabAlbumId || "");
    if (!groups.length) return;
    const strip = $("otd-strip");
    strip.replaceChildren();
    let count = 0;
    for (const g of groups) {
      const yearsAgo = new Date().getFullYear() - g.year;
      for (const a of g.items.slice(0, 6)) {
        if (count++ > 30) break;
        const link = document.createElement("a");
        link.href = viewUrl(cfg.serverUrl, a.id);
        link.target = "_blank";
        link.rel = "noopener";
        link.title = `${yearsAgo} year${yearsAgo === 1 ? "" : "s"} ago`;
        const img = document.createElement("img");
        img.alt = "";
        img.loading = "lazy";
        const badge = document.createElement("div");
        badge.className = "badge";
        badge.textContent = `${yearsAgo}y`;
        link.appendChild(img);
        link.appendChild(badge);
        strip.appendChild(link);
        loadThumbViaBg(a.id, "thumbnail").then((u) => (img.src = u)).catch(() => {});
      }
    }
    if (strip.children.length) $("otd").hidden = false;
  } catch {
    // silent
  }
}

function renderMinimal(cfg) {
  // If the user set an explicit fallback URL, honor it. Otherwise show
  // the minimal clock-only page. Browsers don't let an extension that
  // declares chrome_url_overrides.newtab release the new tab back to the
  // browser without being uninstalled — there's nothing we can do about
  // that from inside the extension. The Settings page now spells this
  // out in the toggle's description so the limitation is visible.
  if (cfg.newtabFallbackUrl) {
    location.replace(cfg.newtabFallbackUrl);
    return;
  }
  document.body.classList.add("minimal");
}

function diagRow(parent, label, status, detail) {
  const r = document.createElement("div");
  r.className = "diag-row";
  const tag = document.createElement("span");
  tag.className = `tag ${status}`;
  tag.textContent = status === "ok" ? "✓" : status === "err" ? "✗" : "·";
  const lbl = document.createElement("strong");
  lbl.textContent = label;
  const det = document.createElement("span");
  det.className = "detail";
  det.textContent = " " + (detail || "");
  r.appendChild(tag);
  r.appendChild(lbl);
  r.appendChild(det);
  parent.appendChild(r);
  return r;
}

async function showSetupOverlay(reason) {
  $("setup").hidden = false;
  const diag = $("diag");
  diag.replaceChildren();

  // Always show a build marker so the user can confirm they're on the latest code.
  const marker = document.createElement("div");
  marker.className = "diag-marker";
  marker.textContent = `build: ${VERSION_TAG} · loaded ${new Date().toLocaleTimeString()}`;
  diag.appendChild(marker);

  // Anything below this line might fail; protect it.
  try {
    diagRow(diag, "reason", "err", reason);

    let raw = {};
    let cfg = {};
    try {
      raw = await chrome.storage.sync.get(null);
    } catch (e) {
      diagRow(diag, "storage.sync.get", "err", e.message);
    }
    try {
      cfg = await getConfig();
    } catch (e) {
      diagRow(diag, "getConfig", "err", e.message);
    }

    const sUrl = (cfg.serverUrl || raw.serverUrl || "").trim();
    const sKey = (cfg.apiKey || raw.apiKey || "").trim();
    diagRow(diag, "serverUrl", sUrl ? "ok" : "err", sUrl || "(empty)");
    diagRow(
      diag,
      "apiKey",
      sKey ? "ok" : "err",
      sKey ? `${sKey.slice(0, 4)}…${sKey.slice(-4)} (${sKey.length} chars)` : "(empty)",
    );
    diagRow(
      diag,
      "sync keys",
      Object.keys(raw).length ? "ok" : "err",
      Object.keys(raw).join(", ") || "(none)",
    );

    // Also peek at storage.local in case Chrome sync is paused/disabled.
    try {
      const local = await chrome.storage.local.get(null);
      diagRow(
        diag,
        "local keys",
        "",
        Object.keys(local).join(", ") || "(none)",
      );
    } catch {}

    if (sUrl && sKey) {
      try {
        await ping();
        diagRow(diag, "ping", "ok", "200 — reloading…");
        setTimeout(() => location.reload(), 600);
      } catch (e) {
        diagRow(diag, "ping", "err", e.message);
      }
    }
  } catch (e) {
    const r = document.createElement("div");
    r.className = "diag-row";
    r.style.color = "#ff6b6b";
    r.textContent = `diag crash: ${e.message}`;
    diag.appendChild(r);
  }
}

async function init() {
  let cfg;
  try {
    cfg = await getConfig();
  } catch (e) {
    return showSetupOverlay(`getConfig threw: ${e.message}`);
  }

  if (cfg.theme === "dark" || cfg.theme === "light") {
    document.documentElement.setAttribute("data-theme", cfg.theme);
  }

  if (cfg.featureNewtab === false) {
    renderMinimal(cfg);
    return;
  }

  if (!isConfigured(cfg)) {
    await showSetupOverlay(
      !cfg.serverUrl && !cfg.apiKey
        ? "Server URL and API key are both empty in chrome.storage.sync."
        : !cfg.serverUrl
          ? "Server URL is empty."
          : "API key is empty.",
    );
    return;
  }

  const tasks = [];
  if (cfg.newtabBackground !== false) tasks.push(loadBackground(cfg));
  if (cfg.newtabOnThisDay !== false) tasks.push(loadOnThisDayStrip(cfg));
  await Promise.all(tasks);
}

$("openSettings").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("recheck").addEventListener("click", () => location.reload());

// Connection-error overlay actions
$("connErrorRetry")?.addEventListener("click", () => {
  hideConnectionErrorOverlay();
  location.reload();
});
$("connErrorSettings")?.addEventListener("click", () => chrome.runtime.openOptionsPage());

chrome.storage.onChanged.addListener((_changes, area) => {
  if (area !== "sync") return;
  location.reload();
});

init().catch((e) => {
  console.error("[immich-companion] init failed:", e);
  showSetupOverlay(`init crashed: ${e.message}`).catch(() => {});
});
