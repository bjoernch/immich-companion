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
let debounce;
let lastQuery = "";
let inflight = 0;

function setEmptyState(html) {
  empty.innerHTML = html;
  empty.classList.add("show");
  results.hidden = true;
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
    const r = await smartSearch(q, 30);
    if (myReq !== inflight) return;
    const items = r?.assets?.items || [];
    status.textContent = items.length ? `${items.length} result${items.length === 1 ? "" : "s"}` : "";
    if (!items.length) {
      setEmptyState(`<div>No matches for <strong>${escapeHtml(q)}</strong>.</div>`);
      return;
    }
    setResultsState();
    results.innerHTML = "";
    for (const a of items) {
      const link = document.createElement("a");
      link.href = viewUrl(cfg.serverUrl, a.id);
      link.target = "_blank";
      link.rel = "noopener";
      link.title = a.originalFileName || a.id;
      const img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      const date = fmtDate(a.exifInfo?.dateTimeOriginal || a.fileCreatedAt);
      link.appendChild(img);
      if (date) {
        const meta = document.createElement("div");
        meta.className = "meta-overlay";
        meta.textContent = date;
        link.appendChild(meta);
      }
      results.appendChild(link);
      loadThumb(a.id, "preview").then((u) => (img.src = u)).catch(() => {});
    }
  } catch (e) {
    if (myReq !== inflight) return;
    status.textContent = "";
    setEmptyState(`<div style="color: var(--danger)">${escapeHtml(e.message)}</div>`);
  }
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
  const url = q ? `${cfg.serverUrl}/search?query=${encodeURIComponent(q)}` : cfg.serverUrl;
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
