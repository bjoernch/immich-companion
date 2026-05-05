import {
  listAlbums,
  ping,
  whoAmI,
  getConfig,
  setConfig,
  serverVersion,
  isConfigured,
  createApiKeyFromSession,
  RECOMMENDED_API_KEY_SCOPES,
} from "../lib/immich.js";
import { applyBrowserPlaceholders, isMacOS } from "../lib/browser-name.js";

applyBrowserPlaceholders();

// Apple-Maps-only options can't be used off-macOS (the maps:// URL scheme
// has no handler). Disable them in their <select>.
if (!isMacOS) {
  for (const el of document.querySelectorAll("option[data-macos-only]")) {
    el.disabled = true;
  }
}

// ---- Permission scope card (mirrors the welcome page) ---------------------
// Tabs flip between Minimal / All; clicking a row copies the scope name to
// the clipboard. Visible on the Connection section so users who skipped
// onboarding still see what scopes their API key needs.
document.querySelectorAll(".perm-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".perm-tab").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".perm-list").forEach((l) => l.classList.remove("active"));
    const list = document.getElementById(`perm-${btn.dataset.tab}`);
    if (list) list.classList.add("active");
  });
});

document.querySelectorAll(".perm-row").forEach((row) => {
  row.addEventListener("click", async () => {
    const text = row.dataset.copy;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const muted = row.querySelector(".muted");
      if (!muted) return;
      const original = muted.textContent;
      muted.textContent = "✓ copied";
      setTimeout(() => { muted.textContent = original; }, 1200);
    } catch {}
  });
});

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
  "archiveOnSave",
];
const TEXT_KEYS = [
  "serverUrl",
  "apiKey",
  "newtabFallbackUrl",
  "sharePathHosts",
];
const SELECT_KEYS = ["defaultAlbumId", "newtabAlbumId", "newtabRotateSeconds", "theme", "mapsProvider"];

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
  if ($("mapsProvider")) {
    // Stored value might be "apple" from a different machine. On non-macOS
    // that option is disabled, so fall back to "google" visually.
    let mp = cfg.mapsProvider || "google";
    if (mp === "apple" && !isMacOS) mp = "google";
    $("mapsProvider").value = mp;
  }

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
  sel.replaceChildren();
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

// ---- Bug-report consent + prefill flow ----------------------------------
//
// The "Found a bug?" card opens a consent modal that previews the exact data
// that will be sent to GitHub via URL parameters when the user opts in to
// the prefilled issue form. The data set is intentionally tiny and the
// builder below treats it as the *only* source of truth — there's no
// branch that could ever serialize the API key or server URL. The Immich
// version fetch in `getImmichServerVersion()` does talk to the user's own
// Immich server (with the API key), but the response is parsed locally
// and only the version string ("major.minor.patch") is returned for the
// prefill. Nothing else from the response leaves this function.

const ISSUE_NEW_BASE = "https://github.com/bjoernch/immich-companion/issues/new";
const ISSUE_PICKER_URL = "https://github.com/bjoernch/immich-companion/issues/new/choose";

// Pulls a numeric version from `userAgentData.brands`, preferring an
// explicit brand match. Falls back to scraping Chrome/Edg/OPR out of
// the UA string. Returns "" when nothing usable is found.
function chromiumVersion(uaData, ua, preferred) {
  if (uaData?.brands) {
    if (preferred) {
      const m = uaData.brands.find((b) => b.brand === preferred);
      if (m?.version) return m.version;
    }
    // Skip Chrome's GREASE entries ("Not_A Brand", "Not(A:Brand", etc.)
    const real = uaData.brands.find((b) => /^\d/.test(b.version) && !/Not.*Brand/i.test(b.brand));
    if (real?.version) return real.version;
  }
  const m = ua.match(/(?:Edg|OPR|Chrome)\/([\d.]+)/);
  return m ? m[1] : "";
}

// Async because Brave's reliable detection signal is the Promise-returning
// `navigator.brave.isBrave()`. Brave's default privacy mode also masks
// `userAgentData.brands` as plain Chromium/Chrome, so brand-array checks
// alone are not enough. The strings returned here MUST exactly match the
// labels in bug_report.yml's `browser` dropdown — GitHub silently drops
// any prefill value that doesn't match a defined option.
async function detectBrowser() {
  const ua = navigator.userAgent || "";
  const uaData = navigator.userAgentData;

  // Firefox is unambiguous from the UA string.
  if (/Firefox\//.test(ua)) {
    const m = ua.match(/Firefox\/([\d.]+)/);
    return { label: "Mozilla Firefox", version: m ? m[1] : "" };
  }

  // Brave: try the explicit API first. Resolves true on Brave, false on
  // anything else; throws if the API isn't there at all.
  if (typeof navigator.brave?.isBrave === "function") {
    try {
      const yes = await navigator.brave.isBrave();
      if (yes) return { label: "Brave", version: chromiumVersion(uaData, ua) };
    } catch {}
  }
  // Some Brave builds expose `navigator.brave` without the function, OR
  // expose Brave in `userAgentData.brands` when fingerprint masking is off.
  if (typeof navigator.brave !== "undefined" ||
      uaData?.brands?.some((b) => b.brand === "Brave")) {
    return { label: "Brave", version: chromiumVersion(uaData, ua) };
  }

  // Edge / Opera / Vivaldi / Chrome ordering matters: Edg/ and OPR/
  // strings appear *in addition* to Chrome/, so check them first.
  if (uaData?.brands?.some((b) => b.brand === "Microsoft Edge") || /Edg\//.test(ua)) {
    return { label: "Microsoft Edge", version: chromiumVersion(uaData, ua, "Microsoft Edge") };
  }
  if (uaData?.brands?.some((b) => b.brand === "Opera") || /OPR\/|Vivaldi/.test(ua)) {
    return { label: "Vivaldi / Opera / other Chromium", version: chromiumVersion(uaData, ua) };
  }
  if (uaData?.brands?.some((b) => b.brand === "Google Chrome") || /Chrome\//.test(ua)) {
    return { label: "Google Chrome", version: chromiumVersion(uaData, ua, "Google Chrome") };
  }
  return { label: "Other", version: "" };
}

// Pretty-format the OS. Tries the modern userAgentData first (cleanest;
// includes "macOS" / "Windows" / "Linux"), with a high-entropy version
// pull when available. Falls back to UA-string heuristics for Firefox.
async function detectOS() {
  const uaData = navigator.userAgentData;
  if (uaData?.platform) {
    let str = uaData.platform; // "macOS" | "Windows" | "Linux" | …
    try {
      if (uaData.getHighEntropyValues) {
        const hi = await uaData.getHighEntropyValues(["platformVersion"]);
        if (hi?.platformVersion) str = `${uaData.platform} ${hi.platformVersion}`;
      }
    } catch {}
    return str;
  }
  const ua = navigator.userAgent || "";
  if (/Mac OS X ([\d_.]+)/.test(ua)) {
    return "macOS " + RegExp.$1.replace(/_/g, ".");
  }
  if (/Windows NT ([\d.]+)/.test(ua)) return "Windows (NT " + RegExp.$1 + ")";
  if (/Android ([\d.]+)/.test(ua)) return "Android " + RegExp.$1;
  if (/Linux/.test(ua)) return "Linux";
  if (/iPhone OS ([\d_]+)/.test(ua)) return "iOS " + RegExp.$1.replace(/_/g, ".");
  return "Unknown";
}

// Talks to the user's own Immich server (NOT to GitHub or anywhere else)
// to pull the version. Returns the version string only — no other field
// from the API response is exposed beyond this function.
async function getImmichServerVersion() {
  try {
    const cfg = await getConfig();
    if (!isConfigured(cfg)) return null;
    const v = await serverVersion();
    if (!v || typeof v !== "object") return null;
    const major = Number.isFinite(v.major) ? v.major : "?";
    const minor = Number.isFinite(v.minor) ? v.minor : "?";
    const patch = Number.isFinite(v.patch) ? v.patch : "?";
    return `${major}.${minor}.${patch}`;
  } catch {
    return null;
  }
}

// Build the prefilled-issue URL. The function only reads from the explicit
// `info` object — any keys not in the list below cannot end up in the URL.
function buildBugReportUrl(info) {
  const params = new URLSearchParams();
  params.set("template", "bug_report.yml");
  if (info.extensionVersion) params.set("extension-version", info.extensionVersion);
  if (info.browser) params.set("browser", info.browser);
  if (info.browserVersion) params.set("browser-version", info.browserVersion);
  if (info.os) params.set("os", info.os);
  if (info.immichVersion) params.set("immich-version", info.immichVersion);
  return `${ISSUE_NEW_BASE}?${params.toString()}`;
}

let pendingInfo = null;

async function openBugReportModal() {
  const modal = $("bugReportModal");
  if (!modal) return;
  pendingInfo = {
    extensionVersion: chrome.runtime.getManifest().version || "",
    browser: "",
    browserVersion: "",
    os: "",
    immichVersion: "",
  };
  $("brExt").textContent = pendingInfo.extensionVersion || "—";
  $("brBrowser").textContent = "Detecting…";
  $("brOs").textContent = "Detecting…";
  $("brImmich").textContent = "Checking…";
  modal.hidden = false;
  document.addEventListener("keydown", modalKeyHandler);

  detectBrowser().then(({ label, version }) => {
    pendingInfo.browser = label;
    pendingInfo.browserVersion = version;
    $("brBrowser").textContent = version ? `${label} ${version}` : label;
  });

  detectOS().then((os) => {
    pendingInfo.os = os;
    $("brOs").textContent = os;
  });

  getImmichServerVersion().then((v) => {
    pendingInfo.immichVersion = v || "";
    $("brImmich").textContent = v || "Not configured";
  });
}

function closeBugReportModal() {
  const modal = $("bugReportModal");
  if (!modal) return;
  modal.hidden = true;
  pendingInfo = null;
  document.removeEventListener("keydown", modalKeyHandler);
}

function modalKeyHandler(e) {
  if (e.key === "Escape") closeBugReportModal();
}

$("issueCard")?.addEventListener("click", (e) => {
  e.preventDefault();
  openBugReportModal().catch(() => {});
});

// ---- "Generate key from session" in Settings → Connection ---------------
//
// Same flow as the welcome page: piggyback on the user's existing Immich
// session cookie to mint a new scoped API key. Used here as a "rotate
// the key" path or a recovery path when the existing key was revoked.

function setSettingsSessionStatus(content, kind = "") {
  const el = $("settingsSessionStatus");
  if (!el) return;
  el.replaceChildren();
  if (typeof content === "string") {
    el.appendChild(document.createTextNode(content));
  } else if (content) {
    el.appendChild(content);
  }
  el.className = `status ${kind}`;
}

$("settingsGenerateKey")?.addEventListener("click", async () => {
  const rawUrl = $("serverUrl").value;
  if (!rawUrl?.trim()) {
    return setSettingsSessionStatus("Set the Server URL above first.", "err");
  }

  setSettingsSessionStatus("Checking your Immich session…");
  $("settingsGenerateKey").disabled = true;

  try {
    const { secret: apiKey, serverUrl } = await createApiKeyFromSession(rawUrl, {
      scopes: RECOMMENDED_API_KEY_SCOPES,
    });
    // Persist + reflect in the form so user sees the new key landed.
    await setConfig({ serverUrl, apiKey });
    $("serverUrl").value = serverUrl;
    $("apiKey").value = apiKey;
    chrome.runtime.sendMessage({ type: "config-updated" }).catch(() => {});

    setSettingsSessionStatus("Verifying…");
    try {
      await ping();
      setSettingsSessionStatus("New key saved and connected ✓", "ok");
      await refreshConnStatus();
    } catch (e) {
      setSettingsSessionStatus(`Saved but ping failed: ${e.message}`, "err");
    }
  } catch (e) {
    if (e?.status === 401 && e?.serverUrl) {
      const wrap = document.createElement("span");
      wrap.appendChild(document.createTextNode("Not signed in at "));
      const link = document.createElement("a");
      try { link.textContent = new URL(e.serverUrl).host; } catch { link.textContent = e.serverUrl; }
      link.href = e.serverUrl;
      link.target = "_blank";
      link.rel = "noopener";
      wrap.appendChild(link);
      wrap.appendChild(document.createTextNode(" — sign in there in any tab, then click again."));
      setSettingsSessionStatus(wrap, "err");
    } else {
      setSettingsSessionStatus(e?.message || String(e), "err");
    }
  } finally {
    $("settingsGenerateKey").disabled = false;
  }
});

// Backdrop / Cancel button — anything with data-close.
document.querySelectorAll("#bugReportModal [data-close]").forEach((el) => {
  el.addEventListener("click", closeBugReportModal);
});

$("brSkip")?.addEventListener("click", () => {
  closeBugReportModal();
  chrome.tabs.create({ url: ISSUE_PICKER_URL });
});

$("brContinue")?.addEventListener("click", () => {
  // Use only the locally-built info object — never read from cfg here.
  const info = pendingInfo || {};
  const url = buildBugReportUrl({
    extensionVersion: info.extensionVersion,
    browser: info.browser,
    browserVersion: info.browserVersion,
    os: info.os,
    immichVersion: info.immichVersion,
  });
  closeBugReportModal();
  chrome.tabs.create({ url });
});
