import { listAlbums, ping, whoAmI, getConfig, setConfig } from "../lib/immich.js";

const $ = (id) => document.getElementById(id);

const TOGGLE_KEYS = [
  "featureNewtab",
  "newtabBackground",
  "newtabOnThisDay",
  "newtabShowMetadata",
  "featureContextMenus",
  "featureShareToolbar",
  "featureNotifications",
  "featureGoogleInline",
  "clipboardCopyOriginal",
];
const TEXT_KEYS = [
  "serverUrl",
  "apiKey",
  "newtabFallbackUrl",
  "sharePathHosts",
];
const SELECT_KEYS = ["defaultAlbumId", "newtabAlbumId", "newtabRotateSeconds", "theme"];

async function load() {
  const cfg = await getConfig();
  for (const k of TEXT_KEYS) {
    if ($(k)) $(k).value = cfg[k] ?? "";
  }
  for (const k of TOGGLE_KEYS) {
    if ($(k)) $(k).checked = Boolean(cfg[k]);
  }
  // Selects need their options populated first.
  await Promise.all([
    populateAlbums("defaultAlbumId", cfg.defaultAlbumId, "— none —"),
    populateAlbums("newtabAlbumId", cfg.newtabAlbumId, "All photos"),
  ]);
  if ($("newtabRotateSeconds")) $("newtabRotateSeconds").value = String(cfg.newtabRotateSeconds || 0);
  if ($("theme")) $("theme").value = cfg.theme || "auto";
  applyTheme(cfg.theme || "auto");

  await refreshConnStatus();
  setVersion();
}

function applyTheme(theme) {
  if (theme === "dark" || theme === "light") {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function setVersion() {
  try {
    const m = chrome.runtime.getManifest();
    $("versionLabel").textContent = `v${m.version}`;
  } catch {}
}

async function refreshConnStatus() {
  const el = $("connStatus");
  const cfg = await getConfig();
  if (!cfg.serverUrl || !cfg.apiKey) {
    el.className = "conn-status";
    el.textContent = "Not configured";
    return;
  }
  el.className = "conn-status";
  el.textContent = "Checking…";
  try {
    await ping();
    let label = "Connected";
    try {
      const me = await whoAmI();
      if (me?.email) label = `Connected · ${me.email}`;
    } catch {}
    el.className = "conn-status ok";
    el.textContent = label;
  } catch (e) {
    el.className = "conn-status err";
    el.textContent = "Connection failed";
  }
}

async function populateAlbums(selectId, selectedId = "", placeholder = "— none —") {
  const sel = $(selectId);
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  sel.appendChild(opt0);
  try {
    const albums = await listAlbums();
    albums.sort((a, b) => (a.albumName || "").localeCompare(b.albumName || ""));
    for (const a of albums) {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = `${a.albumName} (${a.assetCount ?? "?"})`;
      sel.appendChild(opt);
    }
    sel.value = selectedId || prev || "";
  } catch {
    // not configured yet — leave placeholder
  }
}

function setStatus(elId, msg, kind = "") {
  const el = $(elId);
  if (!el) return;
  el.textContent = msg;
  el.className = `status ${kind}`;
  if (msg) setTimeout(() => { if (el.textContent === msg) el.textContent = ""; }, 4000);
}

function collect() {
  const patch = {};
  for (const k of TEXT_KEYS) {
    if ($(k)) patch[k] = $(k).value.trim();
  }
  for (const k of TOGGLE_KEYS) {
    if ($(k)) patch[k] = $(k).checked;
  }
  for (const k of SELECT_KEYS) {
    if ($(k)) patch[k] = k === "newtabRotateSeconds" ? Number($(k).value) : $(k).value;
  }
  if (patch.serverUrl) patch.serverUrl = patch.serverUrl.replace(/\/+$/, "");
  return patch;
}

async function saveAll(showStatus = true) {
  const patch = collect();
  await setConfig(patch);
  // Tell the background to rebuild context menus etc.
  try { chrome.runtime.sendMessage({ type: "config-updated" }); } catch {}
  if (showStatus) {
    setStatus("status", "Saved.", "ok");
    setStatus("globalStatus", "Saved.", "ok");
  }
  await refreshConnStatus();
}

async function test() {
  setStatus("status", "Testing…");
  try {
    await saveAll(false);
    await ping();
    setStatus("status", "Connected ✓", "ok");
    await refreshConnStatus();
  } catch (e) {
    setStatus("status", e.message, "err");
  }
}

// Section navigation
document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.section;
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".section").forEach((s) => {
      s.classList.toggle("active", s.id === `section-${target}`);
    });
    history.replaceState(null, "", `#${target}`);
  });
});
if (location.hash) {
  const target = location.hash.slice(1);
  const btn = document.querySelector(`.nav-item[data-section="${target}"]`);
  if (btn) btn.click();
}

// Wiring
$("save").addEventListener("click", () => saveAll(true));
$("test").addEventListener("click", test);
$("saveAll").addEventListener("click", () => saveAll(true));
$("refreshAlbums").addEventListener("click", async () => {
  await saveAll(false);
  await populateAlbums("defaultAlbumId", $("defaultAlbumId").value, "— none —");
});
$("refreshAlbums2").addEventListener("click", async () => {
  await saveAll(false);
  await populateAlbums("newtabAlbumId", $("newtabAlbumId").value, "All photos");
});

// Auto-save toggles & selects on change for snappier UX.
[...TOGGLE_KEYS, ...SELECT_KEYS].forEach((k) => {
  const el = $(k);
  if (el) el.addEventListener("change", async () => {
    if (k === "theme") applyTheme(el.value);
    await saveAll(false);
  });
});

// Reset all data
$("resetAll").addEventListener("click", async () => {
  const ok = confirm(
    "Wipe every saved setting and reopen the welcome page?\n\n" +
    "This clears the stored server URL, API key, feature toggles, theme, " +
    "default album, and recent uploads from chrome.storage.local on this " +
    "device. Your Immich server is not touched. The API key remains valid " +
    "until you revoke it in Immich → Account Settings → API Keys."
  );
  if (!ok) return;
  setStatus("resetStatus", "Resetting…");
  try {
    await chrome.storage.local.clear();
    try { await chrome.storage.sync.clear(); } catch {}
    chrome.runtime.sendMessage({ type: "config-updated" }).catch(() => {});
    chrome.tabs.create({ url: chrome.runtime.getURL("pages/welcome.html") });
    window.close();
  } catch (e) {
    setStatus("resetStatus", e.message, "err");
  }
});

load();
