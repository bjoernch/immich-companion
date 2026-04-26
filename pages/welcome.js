import { ping, setConfig, getConfig } from "../lib/immich.js";
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
