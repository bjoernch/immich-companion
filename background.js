import {
  getConfig,
  isConfigured,
  uploadAsset,
  addAssetsToAlbum,
  smartSearch,
  thumbnailUrl,
  shareUrl,
  ping,
  createShareLink,
  recordUpload,
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
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const mime = res.headers.get("content-type") || "application/octet-stream";
    const blob = await res.blob();
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
      toast(tabId, {
        id: toastId,
        kind: isDup ? "info" : "success",
        title: isDup ? "Already in Immich" : "Saved to Immich",
        message: `${filename}${cfg.defaultAlbumId && !isDup ? " · added to album" : ""}`,
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
        const res = await fetch(thumbnailUrl(cfg.serverUrl, msg.assetId, msg.size || "preview"), {
          headers: { "x-api-key": cfg.apiKey },
        });
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

// First-run badge check.
updateBadge();
