import "../lib/compat.js";
import {
  getConfig,
  isConfigured,
  smartSearch,
  metadataSearch,
  viewUrl,
  shareUrl,
  videoPlaybackUrl,
  uploadAsset,
  addAssetsToAlbum,
  createShareLink,
  recordUpload,
  getRecentUploads,
  clearRecentUploads,
} from "../lib/immich.js";

// Parse an SVG string into a Node so we can append it without using
// innerHTML. Mozilla's AMO validator flags every `el.innerHTML = ...`
// assignment (even of trusted, hardcoded strings), so all dynamic markup
// in this file is built via DOM APIs only.
function svgNode(svgString) {
  const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
  return doc.documentElement.cloneNode(true);
}

// Replace an element's contents with a single DOM node (or text).
function setOnly(el, child) {
  el.replaceChildren();
  if (child != null)
    el.appendChild(
      typeof child === "string" ? document.createTextNode(child) : child,
    );
}

// Inline SVG icons used in the result quick-actions overlay.
const ICON = {
  // clipboard (copy the picture itself to clipboard)
  clipboard:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>',
  // share (create + copy public link)
  share:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
  download:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  check:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  spinner:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="spin"><path d="M12 2a10 10 0 0 1 10 10" /></svg>',
  // Big play triangle for the video card overlay
  play: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="white"><polygon points="7,4 21,12 7,20"/></svg>',
  // Bigger spinner used while loading the video bytes
  spinnerLg:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" class="spin"><path d="M12 2a10 10 0 0 1 10 10" /></svg>',
  // Diagonal arrows pointing outward — opens the dedicated player window
  expand:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
  // Map-pin (Lucide MapPin) — opens the asset's GPS location in Google Maps
  maps: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  // Cloud-with-slash (Lucide CloudOff) — connection failure illustration
  cloudOff:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M5.78 5.78A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.31-.19"/><path d="M21.53 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.01 7.01 0 0 0 10 5.07"/></svg>',
};

// Inline preview cap. Above this we refuse and tell the user to open in Immich
// instead — fetching multi-GB clips into a Blob would freeze the popup.
const VIDEO_PREVIEW_MAX_BYTES = 150 * 1024 * 1024;

// "0:00:32.123000" / "00:01:23" → "0:32" / "1:23". Returns "" when unparseable.
function fmtDuration(s) {
  if (!s || typeof s !== "string") return "";
  const parts = s.split(":");
  if (parts.length !== 3) return "";
  const hours = parseInt(parts[0], 10) || 0;
  const mins = parseInt(parts[1], 10) || 0;
  const secs = Math.floor(parseFloat(parts[2]) || 0);
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

const $ = (id) => document.getElementById(id);

// ---- Tabs ------------------------------------------------------------------
document.querySelectorAll(".popup-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".popup-tab")
      .forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".popup-panel").forEach((p) => {
      p.classList.toggle("active", p.dataset.panel === btn.dataset.tab);
    });
    if (btn.dataset.tab === "recent") loadRecents();
  });
});

// ---- Search ---------------------------------------------------------------

const results = $("results");
const empty = $("empty");
const status = $("status");
const gallery = $("gallery");
const timeline = $("timeline");
const pagination = $("pagination");
let debounce;
let lastQuery = "";
let inflight = 0;

const PAGE_SIZE = 50;

let currentResults = [];
let currentCfg = null;
let currentMode = "recent"; // "recent" | "search"
let currentQuery = "";
let currentApiPage = 1;
let nextPage = null; // string from Immich API ("2", "3"...) or null
let loadingPage = false;
let currentTypeFilter = "all"; // "all" | "image" | "video" — applied to both modes

// Translate the UI filter into the API's type parameter. "all" → no filter.
function typeFilterParam() {
  if (currentTypeFilter === "image") return "IMAGE";
  if (currentTypeFilter === "video") return "VIDEO";
  return null;
}

// In-memory cache of fetched pages. Key = `${mode}:${query}:${page}`.
// Cleared when mode or query changes. Going back to a previously visited
// page is instant; going forward to a prefetched page is also instant.
const pageCache = new Map();
function pageKey(p) {
  return `${currentMode}:${currentQuery}:${currentTypeFilter}:${p}`;
}

// Cache of thumbnail object URLs by `${assetId}:${size}`. Lets us re-render
// without re-fetching the same image bytes when paging back and forth.
const thumbCache = new Map();

function setEmptyState(content) {
  empty.replaceChildren();
  if (typeof content === "string") {
    const div = document.createElement("div");
    div.textContent = content;
    empty.appendChild(div);
  } else {
    empty.appendChild(content);
  }
  empty.classList.add("show");
  gallery.hidden = true;
  pagination.hidden = true;
}

// Build a small "title + (optional) link" empty-state block as DOM nodes.
function emptyStateNode(title, action) {
  const wrap = document.createElement("div");
  const t = document.createElement("div");
  t.textContent = title;
  wrap.appendChild(t);
  if (action) {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = action.label;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      action.onClick();
    });
    wrap.appendChild(a);
  }
  return wrap;
}

function emptyStateError(message) {
  const div = document.createElement("div");
  div.style.color = "var(--danger)";
  div.textContent = message;
  return div;
}

// Detect "your server is unreachable" so we can show the dedicated card
// instead of a one-liner. Covers timeouts (the AbortController abort path),
// generic network errors (TypeError from fetch), and 5xx server errors.
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

// Card shown in the popup's empty state when the Immich server can't be
// reached. Big icon + headline + technical detail + retry/settings actions.
// Mirrors the layout of the new-tab connection-error overlay.
function connectionErrorNode(error, onRetry) {
  const wrap = document.createElement("div");
  wrap.className = "connection-error";

  const iconEl = document.createElement("div");
  iconEl.className = "connection-error-icon";
  iconEl.appendChild(svgNode(ICON.cloudOff));
  wrap.appendChild(iconEl);

  const titleEl = document.createElement("div");
  titleEl.className = "connection-error-title";
  titleEl.textContent = "Couldn't reach your Immich server";
  wrap.appendChild(titleEl);

  const detailEl = document.createElement("div");
  detailEl.className = "connection-error-detail";
  detailEl.textContent = error?.message || "Unknown error.";
  wrap.appendChild(detailEl);

  const hostEl = document.createElement("div");
  hostEl.className = "connection-error-host";
  try {
    if (currentCfg?.serverUrl)
      hostEl.textContent = new URL(currentCfg.serverUrl).host;
  } catch {}
  if (hostEl.textContent) wrap.appendChild(hostEl);

  const actions = document.createElement("div");
  actions.className = "connection-error-actions";

  const retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.className = "primary";
  retryBtn.textContent = "Retry";
  retryBtn.addEventListener("click", () => {
    if (typeof onRetry === "function") onRetry();
  });
  actions.appendChild(retryBtn);

  const settingsBtn = document.createElement("button");
  settingsBtn.type = "button";
  settingsBtn.textContent = "Open settings";
  settingsBtn.addEventListener("click", openOptions);
  actions.appendChild(settingsBtn);

  wrap.appendChild(actions);
  return wrap;
}
function setResultsState() {
  empty.classList.remove("show");
  gallery.hidden = false;
}

async function loadThumb(assetId, size = "thumbnail") {
  const cacheKey = `${assetId}:${size}`;
  const hit = thumbCache.get(cacheKey);
  if (hit) return hit;
  const promise = new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "thumb", assetId, size }, (res) => {
      if (chrome.runtime.lastError)
        return reject(new Error(chrome.runtime.lastError.message));
      if (!res?.ok)
        return reject(new Error(res?.error || `status ${res?.status}`));
      const blob = new Blob([new Uint8Array(res.data)], {
        type: res.contentType || "image/jpeg",
      });
      resolve(URL.createObjectURL(blob));
    });
  }).catch((e) => {
    // On failure, drop the broken promise from cache so the next try refetches.
    thumbCache.delete(cacheKey);
    throw e;
  });
  thumbCache.set(cacheKey, promise);
  return promise;
}

function renderSkeletons(n = 8) {
  results.replaceChildren();
  setResultsState();
  const heights = [120, 160, 90, 140, 180, 110, 200, 130];
  for (let i = 0; i < n; i++) {
    const sk = document.createElement("div");
    sk.className = "skeleton";
    sk.style.height = `${heights[i % heights.length]}px`;
    results.appendChild(sk);
  }
}

function fmtDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

async function runSearch(q) {
  if (currentMode !== "search" || currentQuery !== q) {
    pageCache.clear();
  }
  currentMode = "search";
  currentQuery = q;
  await loadPage(1);
}

async function showRecentLibrary() {
  if (currentMode !== "recent") {
    pageCache.clear();
  }
  currentMode = "recent";
  currentQuery = "";
  await loadPage(1);
}

// Fetch (or read from cache) one page and render. Used by both the search
// and recent flows, plus the numbered pagination buttons. Subsequent
// navigation to an already-visited page is instant because pages stay in
// pageCache for the lifetime of the popup.
async function loadPage(page) {
  if (page < 1 || loadingPage) return;
  const myReq = ++inflight;

  // 1) Cache hit → render immediately, no spinner.
  const cached = pageCache.get(pageKey(page));
  if (cached) {
    if (!currentCfg) {
      try {
        currentCfg = await getConfig();
      } catch {}
    }
    currentResults = cached.items;
    nextPage = cached.nextPage;
    currentApiPage = page;
    renderResultsPage();
    results.scrollTop = 0;
    // Still prefetch the page after this one in the background.
    if (nextPage) prefetchPage(parseInt(nextPage, 10));
    return;
  }

  // 2) Cache miss → fetch from server.
  loadingPage = true;
  status.textContent = page === 1 ? "Loading…" : `Loading page ${page}…`;
  renderSkeletons();
  try {
    const cfg = await getConfig();
    if (!isConfigured(cfg)) {
      setEmptyState(
        emptyStateNode("Server not configured.", {
          label: "Open settings",
          onClick: openOptions,
        }),
      );
      status.textContent = "";
      return;
    }
    currentCfg = cfg;
    let r;
    const t = typeFilterParam();
    if (currentMode === "search") {
      r = await smartSearch(currentQuery, PAGE_SIZE, page, t);
    } else {
      const params = { order: "desc", page };
      if (t) params.type = t;
      r = await metadataSearch(params, PAGE_SIZE);
    }
    if (myReq !== inflight) return;
    const items = r?.assets?.items || [];
    const np = r?.assets?.nextPage || null;
    pageCache.set(pageKey(page), { items, nextPage: np });
    currentResults = items;
    nextPage = np;
    currentApiPage = page;
    if (!currentResults.length) {
      if (page > 1) {
        loadingPage = false;
        return loadPage(page - 1);
      }
      if (currentMode === "search") {
        const wrap = document.createElement("div");
        wrap.appendChild(document.createTextNode("No matches for "));
        const s = document.createElement("strong");
        s.textContent = currentQuery;
        wrap.appendChild(s);
        wrap.appendChild(document.createTextNode("."));
        setEmptyState(wrap);
      } else {
        setEmptyState("No items in your library yet.");
      }
      return;
    }
    renderResultsPage();
    results.scrollTop = 0;
    if (nextPage) prefetchPage(parseInt(nextPage, 10));
  } catch (e) {
    if (myReq !== inflight) return;
    if (isConnectionError(e)) {
      const retry = () => {
        pageCache.clear();
        loadPage(page);
      };
      setEmptyState(connectionErrorNode(e, retry));
    } else {
      setEmptyState(emptyStateError(e.message));
    }
    status.textContent = "";
  } finally {
    loadingPage = false;
  }
}

// Silently fetches and caches a future page so a "next" click is instant.
// Skips if already cached, already loading, or the user has navigated
// somewhere else by the time it runs.
async function prefetchPage(page) {
  if (!page || pageCache.has(pageKey(page))) return;
  const snapMode = currentMode;
  const snapQuery = currentQuery;
  const snapFilter = currentTypeFilter;
  const t = typeFilterParam();
  try {
    let r;
    if (snapMode === "search") {
      r = await smartSearch(snapQuery, PAGE_SIZE, page, t);
    } else {
      const params = { order: "desc", page };
      if (t) params.type = t;
      r = await metadataSearch(params, PAGE_SIZE);
    }
    // If the user changed mode/query/filter while we were fetching, drop
    // the result rather than poisoning the new cache key.
    if (
      snapMode !== currentMode ||
      snapQuery !== currentQuery ||
      snapFilter !== currentTypeFilter
    )
      return;
    pageCache.set(`${snapMode}:${snapQuery}:${snapFilter}:${page}`, {
      items: r?.assets?.items || [],
      nextPage: r?.assets?.nextPage || null,
    });
  } catch {}
}

// Group items by year+month using their best-available date (EXIF
// dateTimeOriginal first, then fileCreatedAt). Returns an array of
// { key: 'YYYY-MM', label: 'Month YYYY', year, items: [...] } in
// reverse chronological order so the newest month shows first.
function bestDate(a) {
  return (
    a.exifInfo?.dateTimeOriginal || a.fileCreatedAt || a.fileModifiedAt || null
  );
}

function groupByMonth(items) {
  // Sort newest first by best-available date so the timeline is consistent
  // regardless of what order the API returned.
  const sorted = [...items].sort((a, b) => {
    const ad = new Date(bestDate(a) || 0).getTime();
    const bd = new Date(bestDate(b) || 0).getTime();
    return bd - ad;
  });
  const groups = new Map();
  for (const a of sorted) {
    const iso = bestDate(a);
    const d = iso ? new Date(iso) : new Date();
    const y = d.getFullYear();
    const m = d.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    if (!groups.has(key)) {
      const label = d.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
      groups.set(key, { key, label, year: y, month: m, items: [] });
    }
    groups.get(key).items.push(a);
  }
  return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));
}

function renderResultsPage() {
  const total = currentResults.length;
  const lastSuffix = nextPage ? "" : " (last)";
  const label =
    currentMode === "recent"
      ? `Most recent · page ${currentApiPage}${lastSuffix}`
      : `${total} match${total === 1 ? "" : "es"} on page ${currentApiPage}${lastSuffix}`;
  status.textContent = label;

  setResultsState();
  results.replaceChildren();

  const groups = groupByMonth(currentResults);
  for (const g of groups) {
    const section = document.createElement("section");
    section.className = "tl-group";
    section.dataset.key = g.key;
    section.dataset.year = String(g.year);

    const header = document.createElement("header");
    header.className = "tl-group-header";
    header.textContent = g.label;
    section.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "tl-group-grid";
    for (const a of g.items) grid.appendChild(buildResultCard(a));
    section.appendChild(grid);

    results.appendChild(section);
  }
  results.scrollTop = 0;

  renderTimelineScrubber(groups);
  renderPagination();
}

function renderPagination() {
  pagination.replaceChildren();
  // Hide if there's only ever been one page (page 1 with no nextPage)
  if (currentApiPage === 1 && !nextPage) {
    pagination.hidden = true;
    return;
  }
  pagination.hidden = false;

  const mkBtn = (label, onClick, opts = {}) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    if (opts.active) b.classList.add("active");
    if (opts.disabled) b.disabled = true;
    if (onClick && !opts.disabled) b.addEventListener("click", onClick);
    pagination.appendChild(b);
    return b;
  };

  mkBtn("‹", () => loadPage(currentApiPage - 1), {
    disabled: currentApiPage === 1,
  });

  // Sliding window: show 2 pages before and 2 after current. Don't show
  // pages past the last known one (no nextPage means we're already there).
  const start = Math.max(1, currentApiPage - 2);
  const end = nextPage ? currentApiPage + 2 : currentApiPage;
  for (let i = start; i <= end; i++) {
    if (i === currentApiPage) {
      mkBtn(String(i), null, { active: true, disabled: true });
    } else {
      mkBtn(String(i), () => loadPage(i));
    }
  }

  mkBtn("›", () => loadPage(currentApiPage + 1), { disabled: !nextPage });
}

function renderTimelineScrubber(groups) {
  timeline.replaceChildren();
  if (groups.length <= 1) {
    timeline.style.visibility = "hidden";
    return;
  }
  timeline.style.visibility = "";
  // Show one tick per unique year, label only on year boundaries to keep it
  // tidy in a thin strip.
  const seenYears = new Set();
  for (const g of groups) {
    const tick = document.createElement("button");
    tick.type = "button";
    tick.className = "tl-tick";
    tick.dataset.key = g.key;
    if (!seenYears.has(g.year)) {
      seenYears.add(g.year);
      tick.classList.add("year");
      tick.textContent = String(g.year);
      tick.title = g.label;
    } else {
      tick.title = g.label;
    }
    tick.addEventListener("click", () => {
      const target = results.querySelector(`.tl-group[data-key="${g.key}"]`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    timeline.appendChild(tick);
  }
}

function buildResultCard(asset) {
  const isVideo =
    asset.type === "VIDEO" && currentCfg.featureVideoPreview !== false;

  const link = document.createElement("a");
  link.href = viewUrl(currentCfg.serverUrl, asset.id);
  link.target = "_blank";
  link.rel = "noopener";
  link.title = asset.originalFileName || asset.id;
  link.className = isVideo ? "result-card video" : "result-card";

  // Reserve the card's final dimensions via aspect-ratio so masonry doesn't
  // reflow when the thumbnail fetches arrive at varying times.
  const w = asset.exifInfo?.imageWidth || asset.exifInfo?.exifImageWidth || 4;
  const h = asset.exifInfo?.imageHeight || asset.exifInfo?.exifImageHeight || 3;
  link.style.aspectRatio = `${w} / ${h}`;

  const img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";
  img.className = "poster";
  img.addEventListener("load", () => link.classList.add("loaded"));
  img.addEventListener("error", () => link.classList.add("loaded", "failed"));
  link.appendChild(img);

  if (isVideo) {
    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "play-overlay";
    playBtn.title = "Play preview";
    playBtn.setAttribute("aria-label", "Play preview");
    setOnly(playBtn, svgNode(ICON.play));
    playBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      playVideoInCard(link, asset).catch(() => {});
    });
    link.appendChild(playBtn);

    const dur = fmtDuration(asset.duration || asset.exifInfo?.duration);
    if (dur) {
      const badge = document.createElement("div");
      badge.className = "duration-badge";
      badge.textContent = dur;
      link.appendChild(badge);
    }

    // While playing inline, the wrapping <a> must not navigate away.
    link.addEventListener("click", (e) => {
      if (link.classList.contains("playing")) e.preventDefault();
    });
  }

  const date = fmtDate(asset.exifInfo?.dateTimeOriginal || asset.fileCreatedAt);
  if (date) {
    const meta = document.createElement("div");
    meta.className = "meta-overlay";
    meta.textContent = date;
    link.appendChild(meta);
  }

  // Hover quick actions. Videos drop the "Copy" action: clipboard images
  // can't represent a video file, and copying a still poster would surprise.
  const actions = document.createElement("div");
  actions.className = "actions-overlay";
  if (!isVideo) {
    const copyTitle = currentCfg.clipboardCopyOriginal
      ? "Copy original to clipboard"
      : "Copy preview to clipboard";
    actions.appendChild(
      makeActionButton(copyTitle, ICON.clipboard, (btn) =>
        copyImageAction(asset, btn),
      ),
    );
  }
  actions.appendChild(
    makeActionButton("Share link (copy)", ICON.share, (btn) =>
      shareLinkAction(asset, btn),
    ),
  );
  actions.appendChild(
    makeActionButton("Download original", ICON.download, (btn) =>
      downloadOriginalAction(asset, btn),
    ),
  );
  const mapsProvider = currentCfg.mapsProvider || "off";
  if (mapsProvider !== "off") {
    const mapsTitle =
      mapsProvider === "apple" ? "Open in Apple Maps" : "Open in Google Maps";
    actions.appendChild(
      makeActionButton(mapsTitle, ICON.maps, (btn) =>
        openMapsAction(asset, btn),
      ),
    );
  }
  link.appendChild(actions);

  loadThumb(asset.id, "thumbnail")
    .then((u) => (img.src = u))
    .catch(() => {
      link.classList.add("loaded", "failed");
    });

  return link;
}

// Inline mini-player. Fetches Immich's transcoded playback stream into a Blob
// and swaps it in for the poster. Cap at VIDEO_PREVIEW_MAX_BYTES so the popup
// doesn't OOM on huge source files.
async function playVideoInCard(link, asset) {
  if (
    link.classList.contains("playing") ||
    link.classList.contains("video-loading")
  )
    return;
  link.classList.add("video-loading");

  const loader = document.createElement("div");
  loader.className = "video-loader";
  loader.appendChild(svgNode(ICON.spinnerLg));
  link.appendChild(loader);

  const cleanupLoader = () => {
    link.classList.remove("video-loading");
    loader.remove();
  };

  const showCardError = (text) => {
    cleanupLoader();
    const errEl = document.createElement("div");
    errEl.className = "video-error";
    errEl.textContent = text;
    link.appendChild(errEl);
    setTimeout(() => errEl.remove(), 2600);
  };

  let blobUrl;
  try {
    const url = videoPlaybackUrl(currentCfg.serverUrl, asset.id);
    const res = await fetch(url, {
      headers: { "x-api-key": currentCfg.apiKey },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const len = parseInt(res.headers.get("Content-Length") || "0", 10);
    if (len && len > VIDEO_PREVIEW_MAX_BYTES) {
      showCardError("Too large to preview");
      return;
    }
    const blob = await res.blob();
    if (blob.size > VIDEO_PREVIEW_MAX_BYTES) {
      showCardError("Too large to preview");
      return;
    }
    blobUrl = URL.createObjectURL(blob);
  } catch (e) {
    showCardError(e.message?.startsWith("HTTP") ? e.message : "Couldn't load");
    return;
  }

  cleanupLoader();
  link.classList.add("playing");

  const video = document.createElement("video");
  video.className = "video-player";
  video.src = blobUrl;
  video.controls = true;
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  // Stop the wrapping <a>'s click from interfering with the controls.
  video.addEventListener("click", (e) => e.stopPropagation());
  link.appendChild(video);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "video-close";
  closeBtn.title = "Close preview";
  closeBtn.setAttribute("aria-label", "Close preview");
  setOnly(closeBtn, svgNode(ICON.x));
  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      video.pause();
    } catch {}
    video.remove();
    closeBtn.remove();
    expandBtn.remove();
    URL.revokeObjectURL(blobUrl);
    link.classList.remove("playing");
  });
  link.appendChild(closeBtn);

  // "Expand" → open the dedicated player window. The popup will lose focus
  // and close once the new window is focused; the inline blob URL gets
  // reclaimed when the popup document is destroyed, no manual cleanup needed.
  const expandBtn = document.createElement("button");
  expandBtn.type = "button";
  expandBtn.className = "video-expand";
  expandBtn.title = "Open in larger window";
  expandBtn.setAttribute("aria-label", "Open in larger window");
  setOnly(expandBtn, svgNode(ICON.expand));
  expandBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      video.pause();
    } catch {}
    chrome.windows.create({
      url: chrome.runtime.getURL(
        `pages/player.html?id=${encodeURIComponent(asset.id)}`,
      ),
      type: "popup",
      width: 960,
      height: 600,
      focused: true,
    });
  });
  link.appendChild(expandBtn);
}

function makeActionButton(title, iconSvg, handler) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "action-btn";
  btn.title = title;
  setOnly(btn, svgNode(iconSvg));
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.classList.contains("busy")) return;
    btn.classList.add("busy");
    setOnly(btn, svgNode(ICON.spinner));
    try {
      await handler(btn);
      setOnly(btn, svgNode(ICON.check));
      btn.classList.remove("busy");
      btn.classList.add("done");
      setTimeout(() => {
        btn.classList.remove("done");
        setOnly(btn, svgNode(iconSvg));
      }, 1400);
    } catch (err) {
      setOnly(btn, svgNode(ICON.x));
      btn.classList.remove("busy");
      btn.classList.add("err");
      btn.title = err?.message || String(err);
      setTimeout(() => {
        btn.classList.remove("err");
        setOnly(btn, svgNode(iconSvg));
        btn.title = title;
      }, 2400);
    }
  });
  return btn;
}

async function shareLinkAction(asset, _btn) {
  const link = await createShareLink([asset.id]);
  const url = shareUrl(currentCfg.serverUrl, link.key);
  await navigator.clipboard.writeText(url);
}

async function copyImageAction(asset, _btn) {
  // Source URL depends on the user's setting. Preview (default) is a
  // medium-large JPEG that always works. Original respects exact bytes
  // but can be very large and may be a format Chrome can't decode for
  // the clipboard (HEIC, RAW, AVIF) — in that case the canvas-based
  // PNG fallback below tries to rescue it.
  const useOriginal = currentCfg.clipboardCopyOriginal === true;
  const url = useOriginal
    ? `${currentCfg.serverUrl}/api/assets/${asset.id}/original`
    : `${currentCfg.serverUrl}/api/assets/${asset.id}/thumbnail?size=preview`;

  const res = await fetch(url, {
    headers: { "x-api-key": currentCfg.apiKey },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let blob = await res.blob();

  // Most browsers only accept image/png in the clipboard. Try the native
  // MIME first; if that fails, transcode to PNG via canvas.
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type || "image/png"]: blob }),
    ]);
  } catch {
    blob = await blobToPng(blob);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  }
}

async function blobToPng(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))),
        "image/png",
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Opens the asset's GPS coordinates in the configured maps app. Tries the
// asset's local exifInfo first; if missing (search/random endpoints often
// return sparse records), fetches the full asset detail to pull the coords.
// Throws "No GPS info" if the photo has no location — makeActionButton
// surfaces that as the red ✕ state with the message in the tooltip.
async function openMapsAction(asset, _btn) {
  let lat = asset.exifInfo?.latitude;
  let lng = asset.exifInfo?.longitude;

  if (lat == null || lng == null) {
    try {
      const res = await fetch(
        `${currentCfg.serverUrl}/api/assets/${asset.id}`,
        {
          headers: { "x-api-key": currentCfg.apiKey },
        },
      );
      if (res.ok) {
        const detail = await res.json();
        lat = detail.exifInfo?.latitude;
        lng = detail.exifInfo?.longitude;
        // Cache back onto the local asset so a second click is instant.
        if (lat != null && lng != null) {
          asset.exifInfo = {
            ...(asset.exifInfo || {}),
            latitude: lat,
            longitude: lng,
          };
        }
      }
    } catch {}
  }

  if (lat == null || lng == null) {
    throw new Error("No GPS info");
  }

  // "apple" → maps://?q=lat,lng — opens Maps.app on macOS via the OS URL
  // handler. Chrome shows a one-time confirmation prompt on first use.
  // Anything else falls back to Google Maps in a new tab.
  const url =
    currentCfg.mapsProvider === "apple"
      ? `maps://?q=${lat},${lng}`
      : `https://www.google.com/maps?q=${lat},${lng}`;
  chrome.tabs.create({ url });
}

async function downloadOriginalAction(asset, _btn) {
  const filename = asset.originalFileName || `immich-${asset.id}`;

  // Firefox: ask the background script to do the download. The popup-side
  // anchor click silently fails because the popup loses focus mid-fetch,
  // tearing down before the download starts. Background pages don't have
  // focus to lose, so chrome.downloads.download() from there is reliable.
  // The background only handles this branch when chrome.downloads is
  // available (i.e. the Firefox build, where we requested the permission);
  // on Chrome it returns notSupported and we fall through to the anchor
  // path that already works there.
  try {
    const res = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "download-asset", assetId: asset.id, filename },
        (r) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          resolve(r);
        },
      );
    });
    if (res?.ok) return;
    if (!res?.notSupported) {
      // Background tried and failed for a real reason — surface that
      // rather than silently masking it with the anchor fallback (which
      // would also fail on Firefox).
      throw new Error(res?.error || "download failed");
    }
    // res.notSupported → Chrome path; fall through.
  } catch (e) {
    // sendMessage failed entirely — only happens if there's no listener.
    // Fall through to the anchor approach.
    if (e?.message && !/Receiving end does not exist/i.test(e.message)) {
      throw e;
    }
  }

  // Chrome path: fetch in the popup (we have the API key here) and
  // trigger the download via an <a download> click. Works reliably here
  // because Chrome keeps the popup open through synchronous clicks.
  const res = await fetch(
    `${currentCfg.serverUrl}/api/assets/${asset.id}/original`,
    { headers: { "x-api-key": currentCfg.apiKey } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}

$("q").addEventListener("input", (e) => {
  const q = e.target.value.trim();
  clearTimeout(debounce);
  if (!q) {
    lastQuery = "";
    showRecentLibrary();
    return;
  }
  debounce = setTimeout(() => {
    if (q !== lastQuery) {
      lastQuery = q;
      runSearch(q);
    }
  }, 220);
});
$("q").addEventListener("keydown", (e) => {
  if (e.key === "Enter") openSearchInImmich();
});
$("open").addEventListener("click", openSearchInImmich);

async function openSearchInImmich() {
  const q = $("q").value.trim();
  const cfg = await getConfig();
  if (!isConfigured(cfg)) return openOptions();
  let base = cfg.serverUrl.trim().replace(/\/+$/, "");
  // Make sure the URL has a protocol — chrome.tabs.create() with a bare host
  // would otherwise be parsed as a search query.
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  // Immich's web app expects ?query= to be a URL-encoded JSON object, not
  // raw text — e.g. /search?query=%7B%22query%22%3A%22cat%22%7D
  // Without the JSON wrapper the page just spins forever.
  const url = q
    ? `${base}/search?query=${encodeURIComponent(JSON.stringify({ query: q }))}`
    : `${base}/photos`;
  chrome.tabs.create({ url });
}

function openOptions(e) {
  if (e) e.preventDefault();
  chrome.runtime.openOptionsPage();
}
$("settings").addEventListener("click", openOptions);
$("github").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://github.com/bjoernch/immich-companion" });
});

// ---- Recent uploads --------------------------------------------------------

function fmtRelative(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

async function loadRecents() {
  const list = await getRecentUploads();
  const ul = $("recentList");
  const emp = $("recentEmpty");
  const clear = $("clearRecent");
  $("recentCount").textContent = list.length || "";

  if (!list.length) {
    emp.classList.add("show");
    ul.replaceChildren(); // also empty the DOM, not just hide it
    ul.hidden = true;
    clear.hidden = true;
    return;
  }
  emp.classList.remove("show");
  ul.hidden = false;
  clear.hidden = false;
  clear.onclick = async () => {
    await clearRecentUploads();
    loadRecents();
  };

  ul.replaceChildren();
  const cfg = await getConfig();
  for (const item of list) {
    const li = document.createElement("li");
    li.className = "recent-item";

    const thumb = document.createElement("div");
    thumb.className = "recent-thumb";
    if (item.id) {
      const img = document.createElement("img");
      img.alt = "";
      thumb.appendChild(img);
      loadThumb(item.id, "thumbnail")
        .then((u) => (img.src = u))
        .catch(() => {});
    }

    const body = document.createElement("div");
    body.className = "recent-body";
    const name = document.createElement("div");
    name.className = "recent-name";
    name.textContent = item.filename || item.id;
    const meta = document.createElement("div");
    meta.className = "recent-meta";
    const bits = [fmtRelative(item.savedAt)];
    if (item.isDuplicate) bits.push("duplicate");
    if (item.shareUrl) bits.push("shared");
    meta.textContent = bits.join(" · ");
    body.appendChild(name);
    body.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "recent-actions";
    if (item.id && cfg.serverUrl) {
      const open = document.createElement("button");
      open.textContent = "Open";
      open.onclick = () =>
        chrome.tabs.create({ url: viewUrl(cfg.serverUrl, item.id) });
      actions.appendChild(open);
    }
    if (item.shareUrl) {
      const copy = document.createElement("button");
      copy.textContent = "Copy link";
      copy.onclick = async () => {
        try {
          await navigator.clipboard.writeText(item.shareUrl);
          copy.textContent = "Copied ✓";
          setTimeout(() => (copy.textContent = "Copy link"), 1200);
        } catch {}
      };
      actions.appendChild(copy);
    }

    li.appendChild(thumb);
    li.appendChild(body);
    li.appendChild(actions);
    ul.appendChild(li);
  }
}

// Show count on initial load (Recent badge), but don't switch tabs.
getRecentUploads().then((l) => {
  $("recentCount").textContent = l.length || "";
});

// ---- Upload (drag-drop & file picker) -------------------------------------

const dropZone = $("dropZone");
const fileInput = $("fileInput");
const uploadList = $("uploadList");
const dropOverlay = $("dropOverlay");

dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  if (fileInput.files?.length) handleFiles(Array.from(fileInput.files));
  fileInput.value = "";
});

let dragCounter = 0;
window.addEventListener("dragenter", (e) => {
  if (!e.dataTransfer?.types?.includes("Files")) return;
  e.preventDefault();
  dragCounter++;
  dropOverlay.hidden = false;
});
window.addEventListener("dragover", (e) => {
  if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
});
window.addEventListener("dragleave", () => {
  dragCounter = Math.max(0, dragCounter - 1);
  if (dragCounter === 0) dropOverlay.hidden = true;
});
window.addEventListener("drop", (e) => {
  if (!e.dataTransfer?.files?.length) return;
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.hidden = true;
  handleFiles(Array.from(e.dataTransfer.files));
  // Switch to Upload tab so user sees progress.
  document.querySelector('.popup-tab[data-tab="upload"]').click();
});

async function handleFiles(files) {
  const cfg = await getConfig();
  if (!isConfigured(cfg)) {
    openOptions();
    return;
  }
  for (const file of files) {
    const item = renderUploadItem(file.name);
    try {
      const now = new Date(file.lastModified || Date.now()).toISOString();
      const result = await uploadAsset({
        blob: file,
        filename: file.name,
        deviceAssetId: `web-${file.name}-${file.size}-${file.lastModified}`,
        fileCreatedAt: now,
        fileModifiedAt: now,
      });
      if (cfg.defaultAlbumId && result?.id && result?.status !== "duplicate") {
        try {
          await addAssetsToAlbum(cfg.defaultAlbumId, [result.id]);
        } catch {}
      }
      const isDup = result?.status === "duplicate";
      item.classList.remove("busy");
      item.classList.add("ok");
      item.querySelector(".state").textContent = isDup
        ? "duplicate"
        : "saved ✓";
      await recordUpload({
        id: result?.id,
        filename: file.name,
        sourceUrl: null,
        shareUrl: null,
        isDuplicate: isDup,
      });
      $("recentCount").textContent = (await getRecentUploads()).length;
    } catch (e) {
      item.classList.remove("busy");
      item.classList.add("err");
      item.querySelector(".state").textContent = e.message;
    }
  }
}

function renderUploadItem(name) {
  const li = document.createElement("li");
  li.className = "upload-item busy";
  const n = document.createElement("span");
  n.className = "name";
  n.textContent = name;
  const s = document.createElement("span");
  s.className = "state";
  s.textContent = "uploading…";
  li.appendChild(n);
  li.appendChild(s);
  uploadList.prepend(li);
  return li;
}

function applyPopupTheme(cfg) {
  if (cfg.theme === "dark" || cfg.theme === "light") {
    document.documentElement.setAttribute("data-theme", cfg.theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

// Apply theme override (including Match system).
(async () => {
  const cfg = await getConfig();
  applyPopupTheme(cfg);
})();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.theme) return;
  applyPopupTheme({ theme: changes.theme.newValue || "auto" });
});

// Type-filter pills (All / Photos / Videos). Active filter is shared across
// search and metadata-recent modes; flipping it clears the page cache and
// refetches page 1.
document.querySelectorAll(".type-pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    const t = btn.dataset.type;
    if (!t || t === currentTypeFilter) return;
    currentTypeFilter = t;
    document.querySelectorAll(".type-pill").forEach((b) => {
      const isActive = b === btn;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    pageCache.clear();
    loadPage(1);
  });
});

// "Updated to vX.Y.Z" banner. background.js writes the notice on the
// onInstalled(reason="update") event; we render it on the next popup open
// and clear it after the user views the release notes or clicks dismiss.
async function showUpdateBannerIfPending() {
  try {
    const { updateNotice } = await chrome.storage.local.get("updateNotice");
    if (!updateNotice?.to) return;
    const banner = $("updateBanner");
    if (!banner) return;
    $("updateBannerText").textContent = `Updated to v${updateNotice.to}`;
    const link = $("updateBannerLink");
    link.href = `https://github.com/bjoernch/immich-companion/releases/tag/v${encodeURIComponent(updateNotice.to)}`;
    banner.hidden = false;
  } catch {}
}

async function dismissUpdateBanner() {
  const banner = $("updateBanner");
  if (banner) banner.hidden = true;
  try {
    await chrome.storage.local.remove("updateNotice");
  } catch {}
}

$("updateBannerDismiss")?.addEventListener("click", dismissUpdateBanner);
$("updateBannerLink")?.addEventListener("click", () => {
  // Let the link open in a new tab, then clear the notice on the next tick.
  setTimeout(dismissUpdateBanner, 50);
});
showUpdateBannerIfPending();

// On popup open: when no query is typed yet, show the most recent items
// from the library so the search panel isn't a blank slate.
showRecentLibrary().catch(() => {});
