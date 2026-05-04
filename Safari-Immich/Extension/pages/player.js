import "../lib/compat.js";
import {
  getConfig,
  isConfigured,
  videoPlaybackUrl,
  viewUrl,
} from "../lib/immich.js";

// Higher cap than the popup's inline 150MB — this window has its own memory
// budget and the user explicitly asked for the bigger view. Above this we
// punt to Immich's own viewer rather than freezing the tab.
const PLAYER_MAX_BYTES = 500 * 1024 * 1024;

const $ = (id) => document.getElementById(id);

function showStatus(text, action) {
  const el = $("status");
  el.replaceChildren();
  const t = document.createElement("div");
  t.textContent = text;
  el.appendChild(t);
  if (action) {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = action.label;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      action.onClick();
    });
    el.appendChild(a);
  }
  el.hidden = false;
  $("video").hidden = true;
}

async function init() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) return showStatus("No asset id provided.");

  const cfg = await getConfig();
  if (!isConfigured(cfg)) {
    return showStatus("Immich is not configured.", {
      label: "Open settings",
      onClick: () => chrome.runtime.openOptionsPage(),
    });
  }

  if (cfg.theme === "dark" || cfg.theme === "light") {
    document.documentElement.setAttribute("data-theme", cfg.theme);
  }

  // Best-effort: set the window title to the asset's filename.
  try {
    const meta = await fetch(`${cfg.serverUrl}/api/assets/${id}`, {
      headers: { "x-api-key": cfg.apiKey },
    }).then((r) => (r.ok ? r.json() : null));
    if (meta?.originalFileName) document.title = meta.originalFileName;
  } catch {}

  let blobUrl;
  try {
    const res = await fetch(videoPlaybackUrl(cfg.serverUrl, id), {
      headers: { "x-api-key": cfg.apiKey },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const len = parseInt(res.headers.get("Content-Length") || "0", 10);
    if (len && len > PLAYER_MAX_BYTES) {
      return showStatus("Video is too large for inline preview.", {
        label: "Open in Immich",
        onClick: () => (location.href = viewUrl(cfg.serverUrl, id)),
      });
    }

    const blob = await res.blob();
    if (blob.size > PLAYER_MAX_BYTES) {
      return showStatus("Video is too large for inline preview.", {
        label: "Open in Immich",
        onClick: () => (location.href = viewUrl(cfg.serverUrl, id)),
      });
    }
    blobUrl = URL.createObjectURL(blob);
  } catch (e) {
    return showStatus(`Couldn't load video: ${e.message || e}`, {
      label: "Open in Immich",
      onClick: () => (location.href = viewUrl(cfg.serverUrl, id)),
    });
  }

  const video = $("video");
  video.src = blobUrl;

  window.addEventListener("beforeunload", () => {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {}
  });
}

init().catch((e) => showStatus(`Player error: ${e.message || e}`));
