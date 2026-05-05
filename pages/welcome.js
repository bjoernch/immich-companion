import {
  ping,
  setConfig,
  getConfig,
  createApiKeyFromSession,
  RECOMMENDED_API_KEY_SCOPES,
} from "../lib/immich.js";
import { applyBrowserPlaceholders } from "../lib/browser-name.js";

applyBrowserPlaceholders();

const $ = (id) => document.getElementById(id);

// ---- Permission tabs ------------------------------------------------------
document.querySelectorAll(".perm-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".perm-tab").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".perm-list").forEach((l) => l.classList.remove("active"));
    $(`perm-${btn.dataset.tab}`).classList.add("active");
  });
});

// Click a row to copy the scope name to the clipboard.
document.querySelectorAll(".perm-row").forEach((row) => {
  row.addEventListener("click", async () => {
    const text = row.dataset.copy;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const original = row.querySelector(".muted").textContent;
      row.querySelector(".muted").textContent = "✓ copied";
      setTimeout(() => { row.querySelector(".muted").textContent = original; }, 1200);
    } catch {}
  });
});

// ---- Connect step ---------------------------------------------------------

function setStatus(msg, kind = "") {
  const el = $("status");
  el.textContent = msg;
  el.className = `status ${kind}`;
}

async function tryConnect() {
  const serverUrl = $("serverUrl").value.trim().replace(/\/+$/, "");
  const apiKey = $("apiKey").value.trim();
  if (!serverUrl || !apiKey) {
    setStatus("Enter both fields first.", "err");
    return;
  }
  setStatus("Connecting…");
  await setConfig({ serverUrl, apiKey });
  try {
    await ping();
    setStatus("Connected ✓", "ok");
    chrome.runtime.sendMessage({ type: "config-updated" }).catch(() => {});
    revealDone();
  } catch (e) {
    setStatus(e.message, "err");
  }
}

function revealDone() {
  $("step-done").hidden = false;
  $("step-done").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("connect").addEventListener("click", tryConnect);
$("apiKey").addEventListener("keydown", (e) => { if (e.key === "Enter") tryConnect(); });
$("serverUrl").addEventListener("keydown", (e) => { if (e.key === "Enter") tryConnect(); });

// ---- Auto-key creation flow ---------------------------------------------
//
// "Use my existing Immich session" — works for OAuth, SSO, and password
// users alike. createApiKeyFromSession() (in lib/immich.js) does the
// actual work; this is just the welcome-page UI wiring around it.
function setSessionStatus(content, kind = "", elId = "sessionStatus") {
  const el = $(elId);
  if (!el) return;
  el.replaceChildren();
  if (typeof content === "string") {
    el.appendChild(document.createTextNode(content));
  } else if (content) {
    el.appendChild(content);
  }
  el.className = `status ${kind}`;
}

function notSignedInNode(serverUrl) {
  const wrap = document.createElement("span");
  wrap.appendChild(document.createTextNode("Not signed in at "));
  const link = document.createElement("a");
  try { link.textContent = new URL(serverUrl).host; } catch { link.textContent = serverUrl; }
  link.href = serverUrl;
  link.target = "_blank";
  link.rel = "noopener";
  wrap.appendChild(link);
  wrap.appendChild(document.createTextNode(" — sign in there in any tab, then click again."));
  return wrap;
}

async function autoUseSession() {
  const rawUrl = $("autoServerUrl").value;
  if (!rawUrl?.trim()) return setSessionStatus("Server URL required.", "err");

  setSessionStatus("Checking your Immich session…");
  $("autoUseSession").disabled = true;

  try {
    const { secret: apiKey, serverUrl } = await createApiKeyFromSession(rawUrl, {
      scopes: RECOMMENDED_API_KEY_SCOPES,
    });

    await setConfig({ serverUrl, apiKey });
    $("serverUrl").value = serverUrl;
    $("apiKey").value = apiKey;

    setSessionStatus("Verifying…");
    try {
      await ping();
      setSessionStatus("Done — connected ✓", "ok");
      chrome.runtime.sendMessage({ type: "config-updated" }).catch(() => {});
      revealDone();
    } catch (e) {
      setSessionStatus(`Saved key but ping failed: ${e.message}`, "err");
    }
  } catch (e) {
    if (e?.status === 401 && e?.serverUrl) {
      setSessionStatus(notSignedInNode(e.serverUrl), "err");
    } else {
      setSessionStatus(e?.message || String(e), "err");
    }
  } finally {
    $("autoUseSession").disabled = false;
  }
}

$("autoUseSession")?.addEventListener("click", autoUseSession);
$("skip").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// ---- Done step ------------------------------------------------------------

async function loadFinalToggles() {
  const cfg = await getConfig();
  $("featureNewtab").checked = cfg.featureNewtab !== false;
  $("featureContextMenus").checked = cfg.featureContextMenus !== false;
  $("featureNotifications").checked = cfg.featureNotifications !== false;
}
loadFinalToggles();

["featureNewtab", "featureContextMenus", "featureNotifications"].forEach((k) => {
  $(k).addEventListener("change", async () => {
    await setConfig({ [k]: $(k).checked });
    chrome.runtime.sendMessage({ type: "config-updated" }).catch(() => {});
  });
});

$("finish").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("finishClose").addEventListener("click", () => window.close());

// Keyboard shortcut hint reflects the OS modifier.
const isMac = navigator.platform.toUpperCase().includes("MAC");
$("shortcutHint").textContent = isMac ? "⌘ + Shift + L" : "Ctrl + Shift + L";

// If user already configured (extension was reinstalled), show step 4 directly.
(async () => {
  const cfg = await getConfig();
  if (cfg.theme === "dark" || cfg.theme === "light") {
    document.documentElement.setAttribute("data-theme", cfg.theme);
  }
  if (cfg.serverUrl && cfg.apiKey) {
    $("serverUrl").value = cfg.serverUrl;
    $("apiKey").value = cfg.apiKey;
    revealDone();
  }
})();
