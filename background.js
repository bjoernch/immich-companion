import {
  getConfig,
  isConfigured,
  uploadAsset,
  addAssetsToAlbum,
  setAssetArchived,
  smartSearch,
  thumbnailUrl,
  shareUrl,
  ping,
  createShareLink,
  recordUpload,
  randomAssets,
} from "./lib/immich.js";

const MENU = {
  SAVE_IMAGE: "immich-save-image",
  SAVE_VIDEO: "immich-save-video",
  SAVE_AND_SHARE_IMAGE: "immich-save-share-image",
  SAVE_AND_SHARE_VIDEO: "immich-save-share-video",
};

const ALARM_PING = "immich-ping";

// --- Lifecycle -------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async (details) => {
  await rebuildContextMenus();
  chrome.alarms.create(ALARM_PING, { periodInMinutes: 5, when: Date.now() + 1000 });

  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("pages/welcome.html") });
  } else if (details.reason === "update") {
    // Soft-prompt only if user hasn't configured yet.
    const cfg = await getConfig();
    if (!isConfigured(cfg)) {
      chrome.tabs.create({ url: chrome.runtime.getURL("pages/welcome.html") });
    }
    // Stash an update notice for the popup to surface on its next open.
    // Skipped if the version didn't actually change (defensive — Chrome
    // sometimes fires "update" for trivial reloads of unpacked extensions).
    try {
      const m = chrome.runtime.getManifest();
      const from = details.previousVersion || "";
      const to = m.version || "";
      if (from && to && from !== to) {
        await chrome.storage.local.set({
          updateNotice: { from, to, at: Date.now() },
        });
      }
    } catch {}
  }
});
chrome.runtime.onStartup.addListener(async () => {
  await rebuildContextMenus();
  chrome.alarms.create(ALARM_PING, { periodInMinutes: 5, when: Date.now() + 1000 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_PING) await updateBadge();
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local") return;
  if ("featureContextMenus" in changes) await rebuildContextMenus();
  if ("serverUrl" in changes || "apiKey" in changes) await updateBadge();
});

// --- Context menus ---------------------------------------------------------

// Serialize concurrent rebuild calls — onInstalled + onStartup + storage
// change can fire simultaneously and race on removeAll/create.
let rebuildQueue = Promise.resolve();
function rebuildContextMenus() {
  rebuildQueue = rebuildQueue.then(doRebuildContextMenus).catch(() => {});
  return rebuildQueue;
}
async function doRebuildContextMenus() {
  await new Promise((r) => chrome.contextMenus.removeAll(r));
  const cfg = await getConfig();
  if (cfg.featureContextMenus === false) return;
  const create = (props) =>
    new Promise((resolve) => {
      chrome.contextMenus.create(props, () => {
        void chrome.runtime.lastError; // ignore "duplicate id" if it slips through
        resolve();
      });
    });
  await create({ id: MENU.SAVE_IMAGE, title: "Save image to Immich", contexts: ["image"] });
  await create({ id: MENU.SAVE_AND_SHARE_IMAGE, title: "Save image to Immich & copy share link", contexts: ["image"] });
  await create({ id: MENU.SAVE_VIDEO, title: "Save video to Immich", contexts: ["video"] });
  await create({ id: MENU.SAVE_AND_SHARE_VIDEO, title: "Save video to Immich & copy share link", contexts: ["video"] });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const tabId = tab?.id;
  try {
    if (info.menuItemId === MENU.SAVE_IMAGE || info.menuItemId === MENU.SAVE_VIDEO) {
      await saveUrlToImmich(info.srcUrl, tabId, { share: false });
    } else if (info.menuItemId === MENU.SAVE_AND_SHARE_IMAGE || info.menuItemId === MENU.SAVE_AND_SHARE_VIDEO) {
      await saveUrlToImmich(info.srcUrl, tabId, { share: true });
    }
  } catch (e) {
    const msg = e.message || String(e);
    toast(tabId, { id: `err-${Date.now()}`, kind: "error", title: "Immich error", message: msg });
    notify("Immich error", msg);
  }
});

// --- Save / Save & share ---------------------------------------------------

function filenameFromUrl(url) {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() || "image";
    return decodeURIComponent(last.split("?")[0]).slice(0, 120);
  } catch {
    return "download";
  }
}

function ensureExtension(name, mime) {
  if (/\.[a-z0-9]{2,5}$/i.test(name)) return name;
  const map = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif",
    "image/webp": ".webp", "image/avif": ".avif", "image/heic": ".heic",
    "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov",
  };
  return name + (map[mime] || "");
}

// Fetch the asset bytes for a saved URL. blob: URLs only resolve in the
// originating page, so for those we delegate to the page's content script
// (which can fetch them in-page) instead of trying from the SW. Returns
// { blob, mime } on success and throws a user-friendly Error on failure.
async function fetchAssetBytes(url, tabId) {
  if (!url) throw new Error("No URL");

  // blob: URLs are page-scoped; the SW cannot fetch them. Ask the page.
  if (url.startsWith("blob:")) {
    const fromPage = await fetchBlobInTab(tabId, url);
    if (!fromPage) {
      throw new Error(
        "This image is loaded dynamically by the page (blob: URL). " +
        "The page may have already revoked it, or the page blocks " +
        "extensions from reading it. Try right-clicking a different " +
        "version of the image (e.g. open it in a new tab first)."
      );
    }
    return fromPage;
  }

  // data: URLs are inline and fetchable from anywhere.
  if (url.startsWith("data:")) {
    const res = await fetch(url);
    return { blob: await res.blob(), mime: res.headers.get("content-type") || "" };
  }

  // Standard http(s) URLs. Try the source page's content script FIRST when
  // we have a tab id — page-context fetch carries the page's Referer +
  // cookies, which is what most CDNs (cdninstagram, login-walled images,
  // etc.) actually require. Fall back to the SW fetch only if the page
  // can't satisfy the request.
  //
  // This order also dodges a Firefox quirk where background-script fetches
  // sometimes fail with TypeError ("NetworkError when attempting to fetch
  // resource") on URLs the user can load fine in a normal tab.
  if (tabId) {
    const fromPage = await fetchInTab(tabId, url);
    if (fromPage) return fromPage;
  }

  let swErr = null;
  try {
    const res = await fetch(url, { credentials: "omit" });
    if (res.ok) {
      return {
        blob: await res.blob(),
        mime: res.headers.get("content-type") || "application/octet-stream",
      };
    }
    swErr = new Error(`Fetch failed: ${res.status}`);
  } catch (e) {
    swErr = e;
  }

  // Re-throw with friendly framing. Detect network-class failures both by
  // class (TypeError) and by message text — Firefox's exact wording is
  // "NetworkError when attempting to fetch resource"; Chromium is
  // "Failed to fetch" / "net::ERR_…".
  const errMsg = swErr?.message || String(swErr || "");
  if (swErr instanceof TypeError || /NetworkError|Failed to fetch|net::ERR_|CORS/i.test(errMsg)) {
    throw new Error(
      "Couldn't reach the image — the page or its CDN blocks extension " +
      "fetches even though the URL loads in a normal tab. Save the image " +
      "to disk and upload via the popup's Upload tab as a workaround."
    );
  }
  throw swErr;
}

// Same shape as fetchBlobInTab but uses the "fetch-in-page" channel for
// regular http(s) URLs instead of blob: URLs.
function fetchInTab(tabId, url) {
  if (!tabId) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
    try {
      chrome.tabs.sendMessage(tabId, { type: "fetch-in-page", url }, (res) => {
        void chrome.runtime.lastError;
        if (!res?.ok || !res?.data) return finish(null);
        try {
          const bytes = new Uint8Array(res.data);
          const mime = res.contentType || "application/octet-stream";
          finish({ blob: new Blob([bytes], { type: mime }), mime });
        } catch {
          finish(null);
        }
      });
    } catch {
      finish(null);
    }
    setTimeout(() => finish(null), 8000);
  });
}

// Sends a "fetch-blob" message to the source tab's content script, which
// resolves the blob: URL in-page and returns the bytes. Resolves to
// { blob, mime } or null on any failure / timeout.
function fetchBlobInTab(tabId, blobUrl) {
  if (!tabId) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
    try {
      chrome.tabs.sendMessage(tabId, { type: "fetch-blob", url: blobUrl }, (res) => {
        void chrome.runtime.lastError;
        if (!res?.ok || !res?.data) return finish(null);
        try {
          const bytes = new Uint8Array(res.data);
          const mime = res.contentType || "application/octet-stream";
          finish({ blob: new Blob([bytes], { type: mime }), mime });
        } catch {
          finish(null);
        }
      });
    } catch {
      finish(null);
    }
    setTimeout(() => finish(null), 8000);
  });
}

async function saveUrlToImmich(url, tabId, { share = false } = {}) {
  if (!url) throw new Error("No URL");
  const cfg = await getConfig();
  if (!isConfigured(cfg)) {
    chrome.runtime.openOptionsPage();
    throw new Error("Configure server URL and API key first.");
  }

  const filenameInitial = filenameFromUrl(url);
  const toastId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  toast(tabId, {
    id: toastId,
    kind: "info",
    title: share ? "Saving & sharing…" : "Uploading to Immich",
    message: filenameInitial,
    sticky: true,
  });

  try {
    const { blob, mime } = await fetchAssetBytes(url, tabId);
    const filename = ensureExtension(filenameInitial, mime);

    const now = new Date().toISOString();
    const result = await uploadAsset({
      blob,
      filename,
      deviceAssetId: `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fileCreatedAt: now,
      fileModifiedAt: now,
    });

    const isDup = result?.status === "duplicate";

    if (cfg.defaultAlbumId && result?.id && !isDup) {
      try { await addAssetsToAlbum(cfg.defaultAlbumId, [result.id]); } catch {}
    }
    // Optional archive-on-save (hides from main timeline; albums still show
    // it). Only for fresh uploads — re-archiving a duplicate would surprise
    // the user if they had un-archived it on Immich. Errors are surfaced in
    // the success toast rather than silently swallowed: the most common
    // failure is the API key missing the `asset.update` scope, and a silent
    // skip looked like the toggle was broken.
    let archiveStatus = null; // null = not attempted, "ok" = archived, "<msg>" = error
    if (cfg.archiveOnSave && result?.id && !isDup) {
      try {
        await setAssetArchived(result.id, true);
        archiveStatus = "ok";
      } catch (e) {
        const msg = e?.message || String(e);
        if (/\b403\b|forbidden/i.test(msg)) {
          archiveStatus = "API key missing asset.update scope";
        } else if (/\b404\b/.test(msg)) {
          archiveStatus = "Immich version too old for archive";
        } else {
          archiveStatus = msg.slice(0, 90);
        }
      }
    }

    let sharedLinkUrl = null;
    if (share && result?.id) {
      try {
        const link = await createShareLink([result.id]);
        sharedLinkUrl = shareUrl(cfg.serverUrl, link.key);
        // Ask the source tab to copy to clipboard (service workers can't).
        const copied = await copyToClipboardViaTab(tabId, sharedLinkUrl);
        toast(tabId, {
          id: toastId,
          kind: copied ? "success" : "info",
          title: copied ? "Saved & link copied" : "Saved · click to copy link",
          message: sharedLinkUrl,
          link: { url: sharedLinkUrl, copy: !copied },
        });
      } catch (e) {
        toast(tabId, {
          id: toastId,
          kind: "error",
          title: "Saved, but share link failed",
          message: e.message || String(e),
        });
      }
    } else {
      const parts = [filename];
      if (cfg.defaultAlbumId && !isDup) parts.push("added to album");
      if (archiveStatus === "ok") parts.push("archived");
      else if (archiveStatus) parts.push(`archive failed: ${archiveStatus}`);
      toast(tabId, {
        id: toastId,
        // If the archive call errored, downgrade to "info" so the toast
        // doesn't claim full success.
        kind: archiveStatus && archiveStatus !== "ok"
          ? "info"
          : isDup ? "info" : "success",
        title: isDup ? "Already in Immich" : "Saved to Immich",
        message: parts.join(" · "),
      });
    }

    notify(
      isDup ? "Already in Immich" : (share ? "Saved & shared" : "Saved to Immich"),
      sharedLinkUrl || filename,
    );

    await recordUpload({
      id: result?.id,
      filename,
      sourceUrl: url,
      shareUrl: sharedLinkUrl,
      isDuplicate: isDup,
    }).catch(() => {});
  } catch (e) {
    toast(tabId, {
      id: toastId,
      kind: "error",
      title: "Upload failed",
      message: e.message || String(e),
    });
    throw e;
  }
}

async function copyToClipboardViaTab(tabId, text) {
  if (!tabId) return false;
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: "copy-to-clipboard", text },
      (res) => {
        void chrome.runtime.lastError;
        resolve(Boolean(res?.ok));
      },
    );
    // Failsafe: don't hang forever if no listener.
    setTimeout(() => resolve(false), 2000);
  });
}

// --- Notifications ---------------------------------------------------------

async function notify(title, message) {
  const cfg = await getConfig();
  if (cfg.featureNotifications === false) return;
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
    title,
    message: message || "",
    priority: 0,
  });
}

function toast(tabId, payload) {
  if (!tabId) return;
  try {
    chrome.tabs.sendMessage(tabId, { type: "toast", ...payload }, () => {
      void chrome.runtime.lastError;
    });
  } catch {}
}

// --- Connection badge ------------------------------------------------------

async function updateBadge() {
  try {
    const cfg = await getConfig();
    if (!isConfigured(cfg)) {
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#9aa3b2" });
      chrome.action.setTitle({ title: "Immich Companion — not configured" });
      return;
    }
    await ping();
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setTitle({ title: `Immich Companion — connected to ${new URL(cfg.serverUrl).host}` });
  } catch (e) {
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#ff6b6b" });
    chrome.action.setTitle({ title: `Immich Companion — connection failed: ${e.message}` });
  }
}

// --- Messaging from content / popup ---------------------------------------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "thumb") {
        const cfg = await getConfig();
        if (!isConfigured(cfg)) throw new Error("not configured");
        // Same timeout policy as lib/immich.js so unreachable servers don't
        // hang the popup / new-tab indefinitely. 15s is long enough for a
        // slow home-lab Immich, short enough to fail visibly.
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15000);
        let res;
        try {
          res = await fetch(thumbnailUrl(cfg.serverUrl, msg.assetId, msg.size || "preview"), {
            headers: { "x-api-key": cfg.apiKey },
            signal: ctrl.signal,
          });
        } catch (e) {
          if (e?.name === "AbortError") {
            throw new Error("Immich server unreachable (thumbnail fetch timed out after 15s)");
          }
          throw e;
        } finally {
          clearTimeout(timer);
        }
        const buf = await res.arrayBuffer();
        sendResponse({
          ok: res.ok,
          status: res.status,
          contentType: res.headers.get("content-type"),
          data: Array.from(new Uint8Array(buf)),
        });
      } else if (msg?.type === "smart-search") {
        const r = await smartSearch(msg.query, msg.size || 10);
        sendResponse({ ok: true, data: r });
      } else if (msg?.type === "download-asset" && msg.assetId) {
        // Background-driven download for Firefox. chrome.downloads is
        // only granted in the Firefox build (we don't ask Chrome users
        // to re-approve a permission they don't need — the popup-side
        // <a download> path works fine on Chrome).
        //
        // We tried passing `headers: [{x-api-key}]` to chrome.downloads
        // .download but Firefox silently strips auth-shaped headers from
        // download requests, so Immich responds 403 (SERVER_FORBIDDEN).
        // Instead: fetch the bytes here in the background (which works —
        // that's how thumbnails load), wrap in a blob URL, and hand that
        // to the download manager. No headers needed because the bytes
        // are already in hand.
        const TAG = "[immich-companion download]";
        if (!chrome.downloads?.download) {
          console.debug(TAG, "chrome.downloads not available, telling caller to fall back");
          sendResponse({ ok: false, notSupported: true });
        } else {
          const cfg = await getConfig();
          if (!isConfigured(cfg)) {
            console.warn(TAG, "extension not configured");
            throw new Error("not configured");
          }
          const url = `${cfg.serverUrl}/api/assets/${msg.assetId}/original`;
          const filename = msg.filename || `immich-${msg.assetId}`;
          console.debug(TAG, "fetching", { assetId: msg.assetId, filename, url });

          let blobUrl = null;
          try {
            const fetchRes = await fetch(url, {
              headers: { "x-api-key": cfg.apiKey },
            });
            if (!fetchRes.ok) {
              // Log Immich's actual response body — usually a JSON
              // {message,statusCode,error} that names the missing scope.
              const body = await fetchRes.text().catch(() => "");
              console.error(TAG, `HTTP ${fetchRes.status}`, "response body:", body.slice(0, 500));
              if (fetchRes.status === 403) {
                throw new Error(
                  `Immich returned 403 — the API key likely lacks the asset.download scope. ` +
                  `Regenerate your key in Immich → Account Settings → API Keys and tick asset.download.`
                );
              }
              throw new Error(`HTTP ${fetchRes.status}`);
            }
            const blob = await fetchRes.blob();
            console.debug(TAG, "fetched", { size: blob.size, type: blob.type });
            blobUrl = URL.createObjectURL(blob);
            console.debug(TAG, "blob URL", blobUrl);

            const id = await new Promise((resolve, reject) => {
              chrome.downloads.download(
                { url: blobUrl, filename, saveAs: false },
                (downloadId) => {
                  if (chrome.runtime.lastError) {
                    return reject(new Error(chrome.runtime.lastError.message));
                  }
                  if (downloadId === undefined) {
                    return reject(new Error("downloadId undefined"));
                  }
                  resolve(downloadId);
                },
              );
            });
            console.debug(TAG, "queued, id=", id);

            // Watch the lifecycle so we can revoke the blob URL the moment
            // the download finishes (or fails) and surface the failure
            // reason if any. Without this the URL would leak.
            const heldBlobUrl = blobUrl;
            blobUrl = null; // ownership transferred to listener
            const onChanged = (delta) => {
              if (delta.id !== id) return;
              console.debug(TAG, `#${id} change`, delta);
              const finalState = delta.state?.current;
              if (finalState === "complete" || finalState === "interrupted") {
                chrome.downloads.onChanged.removeListener(onChanged);
                try { URL.revokeObjectURL(heldBlobUrl); } catch {}
                if (finalState === "interrupted") {
                  chrome.downloads.search({ id }, (items) => {
                    const it = items?.[0];
                    console.error(TAG, `#${id} interrupted: error=${it?.error} bytesReceived=${it?.bytesReceived} totalBytes=${it?.totalBytes}`);
                  });
                }
              }
            };
            chrome.downloads.onChanged.addListener(onChanged);

            sendResponse({ ok: true, id });
          } catch (err) {
            console.error(TAG, "failed:", err);
            // Failed before the listener took ownership — revoke now.
            if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch {} }
            sendResponse({ ok: false, error: err?.message || String(err) });
          }
        }
      } else if (msg?.type === "newtab-precache") {
        // Top up the new-tab background cache. Lives here in the SW
        // (rather than in newtab.js) because new tabs unload as soon as
        // the user navigates away — the page-side fire-and-forget
        // Promise was getting killed mid-fetch, so the cache stayed
        // empty. The SW persists until its work completes.
        await topUpNewtabBgCache();
        sendResponse({ ok: true });
      } else if (msg?.type === "config-updated") {
        await rebuildContextMenus();
        await updateBadge();
        sendResponse({ ok: true });
      } else if (msg?.type === "recheck-connection") {
        await updateBadge();
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false, error: "unknown message" });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message || String(e) });
    }
  })();
  return true;
});

// --- New-tab background pre-cache ----------------------------------------
//
// pages/newtab.js renders from a queue of pre-fetched preview images and
// fires `chrome.runtime.sendMessage({type: "newtab-precache"})` after
// each render to refill the queue. The work happens here in the SW
// because new-tab pages unload the moment the user types a URL or
// clicks a result, and a fire-and-forget Promise on the page side was
// getting killed mid-fetch. The SW's lifecycle persists across the
// document closing.
//
// Storage layout (mirrors the constants in pages/newtab.js):
//   chrome.storage.local["newtabBgCache"] = { queue: [{assetId, asset, cachedAt}] }
//   caches.open("immich-newtab-bg-v1") holds the actual blob bytes,
//     keyed by https://immich-companion.invalid/newtab-bg/<assetId>
//     — a deliberately fake DNS name, see newtabBgCacheKey() below.
//
// Soft caps: BG_MAX_QUEUED entries × ~500 KB preview ≈ 1.5 MB worst case.

const NEWTAB_BG_CACHE_NAME = "immich-newtab-bg-v1";
const NEWTAB_BG_META_KEY = "newtabBgCache";
const NEWTAB_BG_MAX_QUEUED = 3;

// Cache API only accepts http(s) request URLs. The chrome-extension://
// scheme is rejected with "Request scheme 'chrome-extension' is
// unsupported". `.invalid` is RFC 2606-reserved (DNS resolvers refuse to
// resolve it) so this is a safe-by-design dummy URL — the Cache API just
// treats it as a string key, no network ever happens. Both the SW (here)
// and the new-tab page MUST use the same URL pattern.
function newtabBgCacheKey(assetId) {
  return `https://immich-companion.invalid/newtab-bg/${assetId}`;
}

async function topUpNewtabBgCache() {
  const TAG = "[immich-companion newtab-cache]";
  try {
    console.log(TAG, "topUp called");
    const cfg = await getConfig();
    if (!isConfigured(cfg)) {
      console.warn(TAG, "skipping: extension not configured (no serverUrl/apiKey)");
      return;
    }
    if (cfg.featureNewtab === false) {
      console.log(TAG, "skipping: featureNewtab off");
      return;
    }
    if (cfg.newtabBackground === false) {
      console.log(TAG, "skipping: newtabBackground off");
      return;
    }

    const r = await chrome.storage.local.get(NEWTAB_BG_META_KEY);
    const meta = r?.[NEWTAB_BG_META_KEY] && Array.isArray(r[NEWTAB_BG_META_KEY].queue)
      ? r[NEWTAB_BG_META_KEY]
      : { queue: [] };
    console.log(TAG, "current queue length:", meta.queue.length);

    if (meta.queue.length >= NEWTAB_BG_MAX_QUEUED) {
      console.log(TAG, "queue already at cap, nothing to do");
      return;
    }

    console.log(TAG, "fetching random asset…");
    const items = await randomAssets({ count: 1, albumId: cfg.newtabAlbumId || "" });
    const asset = Array.isArray(items) ? items[0] : items?.assets?.items?.[0];
    if (!asset?.id) {
      console.warn(TAG, "randomAssets returned no asset", items);
      return;
    }
    console.log(TAG, "got asset id:", asset.id);
    if (meta.queue.some((e) => e.assetId === asset.id)) {
      console.log(TAG, "asset already queued, skipping");
      return;
    }

    if (cfg.newtabShowMetadata !== false) {
      const exif = asset.exifInfo;
      const sparse = !exif || Object.keys(exif).length === 0 ||
        (!exif.make && !exif.model && !exif.iso && !exif.fNumber);
      if (sparse) {
        try {
          const detail = await fetch(`${cfg.serverUrl}/api/assets/${asset.id}`, {
            headers: { "x-api-key": cfg.apiKey, Accept: "application/json" },
          }).then((res) => (res.ok ? res.json() : null));
          if (detail) Object.assign(asset, detail);
        } catch (e) {
          console.warn(TAG, "exif hydration failed (non-fatal):", e?.message || e);
        }
      }
    }

    console.log(TAG, "fetching preview bytes…");
    const thumbRes = await fetch(thumbnailUrl(cfg.serverUrl, asset.id, "preview"), {
      headers: { "x-api-key": cfg.apiKey },
    });
    if (!thumbRes.ok) {
      console.warn(TAG, "thumbnail fetch failed:", thumbRes.status);
      return;
    }
    const blob = await thumbRes.blob();
    console.log(TAG, "fetched blob:", blob.size, "bytes,", blob.type);

    const cache = await caches.open(NEWTAB_BG_CACHE_NAME);
    await cache.put(newtabBgCacheKey(asset.id), new Response(blob, {
      headers: { "Content-Type": blob.type || "image/jpeg" },
    }));
    console.log(TAG, "cache.put done");

    meta.queue.push({ assetId: asset.id, asset, cachedAt: Date.now() });

    while (meta.queue.length > NEWTAB_BG_MAX_QUEUED) {
      const oldest = meta.queue.shift();
      try { await cache.delete(newtabBgCacheKey(oldest.assetId)); } catch {}
    }

    await chrome.storage.local.set({ [NEWTAB_BG_META_KEY]: meta });
    console.log(TAG, "DONE — queue length now:", meta.queue.length);
  } catch (e) {
    console.warn(TAG, "top-up failed:", e?.message || e, e?.stack);
  }
}

// First-run badge check.
updateBadge();
