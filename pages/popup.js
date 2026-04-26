import {
  getConfig,
  isConfigured,
  smartSearch,
  metadataSearch,
  viewUrl,
  shareUrl,
  uploadAsset,
  addAssetsToAlbum,
  createShareLink,
  recordUpload,
  getRecentUploads,
  clearRecentUploads,
} from "../lib/immich.js";

// Inline SVG icons used in the result quick-actions overlay.
const ICON = {
  // clipboard (copy the picture itself to clipboard)
  clipboard: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>',
  // share (create + copy public link)
  share: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
  download: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  spinner: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="spin"><path d="M12 2a10 10 0 0 1 10 10" /></svg>',
};

const $ = (id) => document.getElementById(id);

// ---- Tabs ------------------------------------------------------------------
document.querySelectorAll(".popup-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".popup-tab").forEach((b) => b.classList.toggle("active", b === btn));
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
let debounce;
let lastQuery = "";
let inflight = 0;

let currentResults = [];
let currentCfg = null;
let currentMode = "recent"; // "recent" | "search"

function setEmptyState(html) {
  empty.innerHTML = html;
  empty.classList.add("show");
  gallery.hidden = true;
}
function setResultsState() {
  empty.classList.remove("show");
  gallery.hidden = false;
}

async function loadThumb(assetId, size = "preview") {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "thumb", assetId, size }, (res) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!res?.ok) return reject(new Error(res?.error || `status ${res?.status}`));
      const blob = new Blob([new Uint8Array(res.data)], { type: res.contentType || "image/jpeg" });
      resolve(URL.createObjectURL(blob));
    });
  });
}

function renderSkeletons(n = 8) {
  results.innerHTML = "";
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
  try { return new Date(iso).toLocaleDateString(); } catch { return ""; }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function runSearch(q) {
  const myReq = ++inflight;
  currentMode = "search";
  status.textContent = "Searching…";
  renderSkeletons();
  try {
    const cfg = await getConfig();
    if (!isConfigured(cfg)) {
      setEmptyState('<div>Server not configured.</div><a href="#" id="goSettings">Open settings</a>');
      $("goSettings").addEventListener("click", openOptions);
      status.textContent = "";
      return;
    }
    currentCfg = cfg;
    // Match what the Immich web app shows for a smart-search result page.
    // Immich validates size up to 1000; 250 is a comfortable upper bound for
    // browsing in a popup without making the JSON payload heavy.
    const r = await smartSearch(q, 250);
    if (myReq !== inflight) return;
    currentResults = r?.assets?.items || [];
    if (!currentResults.length) {
      status.textContent = "";
      setEmptyState(`<div>No matches for <strong>${escapeHtml(q)}</strong>.</div>`);
      return;
    }
    renderResultsPage();
  } catch (e) {
    if (myReq !== inflight) return;
    status.textContent = "";
    setEmptyState(`<div style="color: var(--danger)">${escapeHtml(e.message)}</div>`);
  }
}

async function showRecentLibrary() {
  const myReq = ++inflight;
  currentMode = "recent";
  status.textContent = "Loading recent…";
  renderSkeletons();
  try {
    const cfg = await getConfig();
    if (!isConfigured(cfg)) {
      setEmptyState('<div>Server not configured.</div><a href="#" id="goSettings">Open settings</a>');
      $("goSettings").addEventListener("click", openOptions);
      status.textContent = "";
      return;
    }
    currentCfg = cfg;
    // Empty metadata search defaults to ordering by date desc, so we get the
    // newest items first. Same pagination + quick actions as search results.
    const r = await metadataSearch({ order: "desc" }, 250);
    if (myReq !== inflight) return;
    currentResults = r?.assets?.items || [];
    if (!currentResults.length) {
      status.textContent = "";
      setEmptyState("<div>No items in your library yet.</div>");
      return;
    }
    renderResultsPage();
  } catch (e) {
    if (myReq !== inflight) return;
    status.textContent = "";
    setEmptyState(`<div style="color: var(--danger)">${escapeHtml(e.message)}</div>`);
  }
}

// Group items by year+month using their best-available date (EXIF
// dateTimeOriginal first, then fileCreatedAt). Returns an array of
// { key: 'YYYY-MM', label: 'Month YYYY', year, items: [...] } in
// reverse chronological order so the newest month shows first.
function bestDate(a) {
  return a.exifInfo?.dateTimeOriginal || a.fileCreatedAt || a.fileModifiedAt || null;
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
      const label = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      groups.set(key, { key, label, year: y, month: m, items: [] });
    }
    groups.get(key).items.push(a);
  }
  return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));
}

function renderResultsPage() {
  const total = currentResults.length;
  const label = currentMode === "recent"
    ? `Most recent · ${total} item${total === 1 ? "" : "s"}`
    : `${total} result${total === 1 ? "" : "s"}`;
  status.textContent = label;

  setResultsState();
  results.innerHTML = "";

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
}

function renderTimelineScrubber(groups) {
  timeline.innerHTML = "";
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
  const link = document.createElement("a");
  link.href = viewUrl(currentCfg.serverUrl, asset.id);
  link.target = "_blank";
  link.rel = "noopener";
  link.title = asset.originalFileName || asset.id;
  link.className = "result-card";

  // Reserve the card's final dimensions via aspect-ratio so masonry doesn't
  // reflow when the thumbnail fetches arrive at varying times.
  const w = asset.exifInfo?.imageWidth || asset.exifInfo?.exifImageWidth || 4;
  const h = asset.exifInfo?.imageHeight || asset.exifInfo?.exifImageHeight || 3;
  link.style.aspectRatio = `${w} / ${h}`;

  const img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";
  img.addEventListener("load", () => link.classList.add("loaded"));
  img.addEventListener("error", () => link.classList.add("loaded", "failed"));
  link.appendChild(img);

  const date = fmtDate(asset.exifInfo?.dateTimeOriginal || asset.fileCreatedAt);
  if (date) {
    const meta = document.createElement("div");
    meta.className = "meta-overlay";
    meta.textContent = date;
    link.appendChild(meta);
  }

  // Hover quick actions
  const actions = document.createElement("div");
  actions.className = "actions-overlay";
  const copyTitle = currentCfg.clipboardCopyOriginal
    ? "Copy original to clipboard"
    : "Copy preview to clipboard";
  actions.appendChild(makeActionButton(copyTitle, ICON.clipboard,
    (btn) => copyImageAction(asset, btn)));
  actions.appendChild(makeActionButton("Share link (copy)", ICON.share,
    (btn) => shareLinkAction(asset, btn)));
  actions.appendChild(makeActionButton("Download original", ICON.download,
    (btn) => downloadOriginalAction(asset, btn)));
  link.appendChild(actions);

  loadThumb(asset.id, "preview").then((u) => (img.src = u)).catch(() => {
    link.classList.add("loaded", "failed");
  });

  return link;
}

function makeActionButton(title, iconSvg, handler) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "action-btn";
  btn.title = title;
  btn.innerHTML = iconSvg;
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.classList.contains("busy")) return;
    btn.classList.add("busy");
    const original = btn.innerHTML;
    btn.innerHTML = ICON.spinner;
    try {
      await handler(btn);
      btn.innerHTML = ICON.check;
      btn.classList.remove("busy");
      btn.classList.add("done");
      setTimeout(() => {
        btn.classList.remove("done");
        btn.innerHTML = original;
      }, 1400);
    } catch (err) {
      btn.innerHTML = ICON.x;
      btn.classList.remove("busy");
      btn.classList.add("err");
      btn.title = err?.message || String(err);
      setTimeout(() => {
        btn.classList.remove("err");
        btn.innerHTML = original;
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
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
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

async function downloadOriginalAction(asset, _btn) {
  // Fetch the original via the API (with x-api-key header) and trigger a
  // download from the resulting blob — <a download> can't send the header.
  const res = await fetch(
    `${currentCfg.serverUrl}/api/assets/${asset.id}/original`,
    { headers: { "x-api-key": currentCfg.apiKey } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = asset.originalFileName || `immich-${asset.id}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
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
$("q").addEventListener("keydown", (e) => { if (e.key === "Enter") openSearchInImmich(); });
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
    ul.innerHTML = "";   // also empty the DOM, not just hide it
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

  ul.innerHTML = "";
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
      loadThumb(item.id, "thumbnail").then((u) => (img.src = u)).catch(() => {});
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
      open.onclick = () => chrome.tabs.create({ url: viewUrl(cfg.serverUrl, item.id) });
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
getRecentUploads().then((l) => { $("recentCount").textContent = l.length || ""; });

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
        try { await addAssetsToAlbum(cfg.defaultAlbumId, [result.id]); } catch {}
      }
      const isDup = result?.status === "duplicate";
      item.classList.remove("busy");
      item.classList.add("ok");
      item.querySelector(".state").textContent = isDup ? "duplicate" : "saved ✓";
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

// Apply theme override if user picked dark/light explicitly.
(async () => {
  const cfg = await getConfig();
  if (cfg.theme === "dark" || cfg.theme === "light") {
    document.documentElement.setAttribute("data-theme", cfg.theme);
  }
})();

// On popup open: when no query is typed yet, show the most recent items
// from the library so the search panel isn't a blank slate.
showRecentLibrary().catch(() => {});
