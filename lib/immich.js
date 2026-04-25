// Thin wrapper around the Immich REST API.
// All methods read config from chrome.storage.local at call time so the user
// can change server/key without reloading the extension.

const DEFAULTS = {
  // connection
  serverUrl: "",
  apiKey: "",
  // Save to Immich
  defaultAlbumId: "",
  // New Tab
  featureNewtab: true,
  newtabBackground: true,
  newtabOnThisDay: true,
  newtabAlbumId: "",            // "" = all photos
  newtabRotateSeconds: 0,       // 0 = no auto-rotate
  newtabFallbackUrl: "",        // when featureNewtab is false
  // Other features
  featureContextMenus: true,
  featureShareToolbar: true,
  featureNotifications: true,
  featureGoogleInline: true,
  // Search & share
  sharePathHosts: "",
  // Theme
  theme: "auto",                // "auto" | "dark" | "light"
};

const STORAGE = chrome.storage.local;

// One-shot migration from older sync-based config. Safe to call repeatedly:
// no-ops if local already has data.
let migrationDone = false;
async function ensureMigrated() {
  if (migrationDone) return;
  migrationDone = true;
  try {
    const local = await chrome.storage.local.get(["serverUrl", "apiKey"]);
    if (local.serverUrl || local.apiKey) return;
    const sync = await chrome.storage.sync.get(null);
    if (sync && Object.keys(sync).length) {
      await chrome.storage.local.set(sync);
    }
  } catch {}
}

export async function getConfig() {
  await ensureMigrated();
  const stored = await STORAGE.get(Object.keys(DEFAULTS));
  const cfg = { ...DEFAULTS, ...stored };
  cfg.serverUrl = (cfg.serverUrl || "").trim().replace(/\/+$/, "");
  cfg.apiKey = (cfg.apiKey || "").trim();
  return cfg;
}

export async function setConfig(patch) {
  await STORAGE.set(patch);
}

export function isConfigured(cfg) {
  return Boolean(cfg.serverUrl && cfg.apiKey);
}

function apiBase(serverUrl) {
  return `${serverUrl}/api`;
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const cfg = await getConfig();
  if (!isConfigured(cfg)) throw new Error("Immich not configured");
  const res = await fetch(`${apiBase(cfg.serverUrl)}${path}`, {
    method,
    headers: {
      "x-api-key": cfg.apiKey,
      Accept: "application/json",
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...headers,
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Immich ${method} ${path} failed: ${res.status} ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export async function ping() {
  const cfg = await getConfig();
  if (!isConfigured(cfg)) throw new Error("Immich not configured");
  const res = await fetch(`${apiBase(cfg.serverUrl)}/server/ping`, {
    headers: { "x-api-key": cfg.apiKey },
  });
  if (!res.ok) throw new Error(`Ping failed: ${res.status}`);
  return res.json();
}

export async function whoAmI() { return request("/users/me"); }
export async function listAlbums() { return request("/albums"); }
export async function getAlbum(id) { return request(`/albums/${id}`); }
export async function createAlbum(albumName) { return request("/albums", { method: "POST", body: { albumName } }); }
export async function addAssetsToAlbum(albumId, assetIds) {
  return request(`/albums/${albumId}/assets`, { method: "PUT", body: { ids: assetIds } });
}

export async function smartSearch(query, size = 20) {
  return request("/search/smart", { method: "POST", body: { query, size } });
}
export async function metadataSearch(params, size = 20) {
  return request("/search/metadata", { method: "POST", body: { ...params, size } });
}

export async function randomAssets({ count = 1, albumId = "" } = {}) {
  const body = { size: count };
  if (albumId) body.albumIds = [albumId];
  try {
    return await request("/search/random", { method: "POST", body });
  } catch (e) {
    if (albumId) {
      const album = await getAlbum(albumId);
      const items = (album?.assets || []).filter((a) => !a.isTrashed);
      if (!items.length) return [];
      const out = [];
      const used = new Set();
      while (out.length < Math.min(count, items.length)) {
        const i = Math.floor(Math.random() * items.length);
        if (used.has(i)) continue;
        used.add(i);
        out.push(items[i]);
      }
      return out;
    }
    throw e;
  }
}

export async function onThisDay(now = new Date(), albumId = "") {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const results = [];
  for (let i = 1; i <= 10; i++) {
    const year = now.getFullYear() - i;
    const start = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00.000Z`;
    const end = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T23:59:59.999Z`;
    try {
      const params = { takenAfter: start, takenBefore: end, type: "IMAGE" };
      if (albumId) params.albumIds = [albumId];
      const r = await metadataSearch(params, 50);
      const items = r?.assets?.items || [];
      if (items.length) results.push({ year, items });
    } catch {}
  }
  return results;
}

export function thumbnailUrl(serverUrl, assetId, size = "preview") {
  return `${apiBase(serverUrl)}/assets/${assetId}/thumbnail?size=${size}`;
}
export function viewUrl(serverUrl, assetId) {
  return `${serverUrl}/photos/${assetId}`;
}
export function shareUrl(serverUrl, key) {
  return `${serverUrl}/share/${key}`;
}

export async function uploadAsset({ blob, filename, deviceAssetId, fileCreatedAt, fileModifiedAt }) {
  const cfg = await getConfig();
  if (!isConfigured(cfg)) throw new Error("Immich not configured");
  const fd = new FormData();
  fd.append("assetData", blob, filename);
  fd.append("deviceAssetId", deviceAssetId);
  fd.append("deviceId", "immich-companion-extension");
  fd.append("fileCreatedAt", fileCreatedAt);
  fd.append("fileModifiedAt", fileModifiedAt);
  fd.append("isFavorite", "false");
  const res = await fetch(`${apiBase(cfg.serverUrl)}/assets`, {
    method: "POST",
    headers: { "x-api-key": cfg.apiKey, Accept: "application/json" },
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function createShareLink(assetIds, { expiresAt = null, allowDownload = true, showMetadata = true } = {}) {
  const body = {
    type: "INDIVIDUAL",
    assetIds: Array.isArray(assetIds) ? assetIds : [assetIds],
    allowDownload,
    showMetadata,
    allowUpload: false,
  };
  if (expiresAt) body.expiresAt = expiresAt;
  return request("/shared-links", { method: "POST", body });
}

// ---- Recent uploads --------------------------------------------------------

const RECENTS_KEY = "recentUploads";
const RECENTS_LIMIT = 30;

export async function recordUpload(entry) {
  const { [RECENTS_KEY]: list = [] } = await STORAGE.get(RECENTS_KEY);
  list.unshift({ ...entry, savedAt: Date.now() });
  if (list.length > RECENTS_LIMIT) list.length = RECENTS_LIMIT;
  await STORAGE.set({ [RECENTS_KEY]: list });
}

export async function getRecentUploads() {
  const { [RECENTS_KEY]: list = [] } = await STORAGE.get(RECENTS_KEY);
  return list;
}

export async function clearRecentUploads() {
  await STORAGE.set({ [RECENTS_KEY]: [] });
}
