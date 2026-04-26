import {
  getConfig,
  isConfigured,
  smartSearch,
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
  // image (copy the picture itself to clipboard)
  image: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
  // share (create + copy public link)
  share: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
  download: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  spinner: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="spin"><path d="M12 2a10 10 0 0 1 10 10" /></svg>',
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
const pagination = $("pagination");
let debounce;
let lastQuery = "";
let inflight = 0;

// Pagination state
const PAGE_SIZE = 8;
let currentResults = [];
let currentPage = 0;
let currentCfg = null;

function setEmptyState(html) {
  empty.innerHTML = html;
  empty.classList.add("show");
  results.hidden = true;
  pagination.hidden = true;
}
function setResultsState() {
  empty.classList.remove("show");
  results.hidden = false;
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
    currentPage = 0;
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

function renderResultsPage() {
  const total = currentResults.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  const start = currentPage * PAGE_SIZE;
  const items = currentResults.slice(start, start + PAGE_SIZE);

  status.textContent = `${total} result${total === 1 ? "" : "s"} · page ${currentPage + 1} of ${pages}`;

  setResultsState();
  results.innerHTML = "";
  for (const a of items) results.appendChild(buildResultCard(a));
  results.scrollTop = 0;

  renderPagination(total, pages);
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
  actions.appendChild(makeActionButton("Copy image to clipboard", ICON.image,
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
  // Fetch a high-quality preview thumbnail (medium-large JPEG) — full
  // originals can be 10s of MB which is too heavy for clipboard.
  const res = await fetch(
    `${currentCfg.serverUrl}/api/assets/${asset.id}/thumbnail?size=preview`,
    { headers: { "x-api-key": currentCfg.apiKey } },
  );
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

function renderPagination(total, pages) {
  pagination.innerHTML = "";
  if (pages <= 1) {
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
    if (onClick) b.addEventListener("click", onClick);
    pagination.appendChild(b);
    return b;
  };

  mkBtn("‹", () => { if (currentPage > 0) { currentPage--; renderResultsPage(); } },
        { disabled: currentPage === 0 });

  // Show up to 5 page numbers, sliding window around current page.
  const window_ = 5;
  let start = Math.max(0, currentPage - Math.floor(window_ / 2));
  let end = Math.min(pages, start + window_);
  start = Math.max(0, end - window_);
  for (let i = start; i < end; i++) {
    mkBtn(String(i + 1), () => { currentPage = i; renderResultsPage(); },
          { active: i === currentPage });
  }

  mkBtn("›", () => { if (currentPage < pages - 1) { currentPage++; renderResultsPage(); } },
        { disabled: currentPage >= pages - 1 });
}

$("q").addEventListener("input", (e) => {
  const q = e.target.value.trim();
  clearTimeout(debounce);
  if (!q) {
    inflight++;
    setEmptyState(`
      <div>Type to search your library.</div>
      <div class="hint">Smart search uses CLIP — try "dog at the beach" or "red sunset".</div>
    `);
    status.textContent = "";
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
