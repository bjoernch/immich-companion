#!/usr/bin/env bash
# Package the extension for distribution.
# Produces:
#   dist/immich-companion-chrome-<version>.zip   (Chrome / Edge / Brave)
#   dist/immich-companion-firefox-<version>.zip  (Firefox AMO)
set -euo pipefail

cd "$(dirname "$0")"

VERSION=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
OUT_DIR="dist"
STAGE="$OUT_DIR/build"

stage_common() {
  local out="$1"
  rm -rf "$out"
  mkdir -p "$out"
  cp background.js "$out/"
  cp content.js "$out/"
  cp content.css "$out/"
  cp LICENSE "$out/"
  cp -R lib "$out/"
  cp -R pages "$out/"
  mkdir -p "$out/icons"
  cp icons/*.png "$out/icons/"
  find "$out" -name '.DS_Store' -delete
  find "$out" -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null || true
  find "$out" -name '*.pyc' -delete
}

# ---------- Chrome ----------
CHROME_STAGE="$STAGE-chrome"
CHROME_ZIP="$OUT_DIR/immich-companion-chrome-${VERSION}.zip"
stage_common "$CHROME_STAGE"
cp manifest.json "$CHROME_STAGE/manifest.json"
rm -f "$CHROME_ZIP"
( cd "$CHROME_STAGE" && zip -qr "../../$CHROME_ZIP" . )
echo "wrote $CHROME_ZIP ($(du -h "$CHROME_ZIP" | cut -f1))"

# ---------- Firefox ----------
# AMO requires browser_specific_settings.gecko; we keep service_worker since
# Firefox 121+ supports it. Strip Chrome-only minimum_chrome_version.
FIREFOX_STAGE="$STAGE-firefox"
FIREFOX_ZIP="$OUT_DIR/immich-companion-firefox-${VERSION}.zip"
stage_common "$FIREFOX_STAGE"
python3 - "$FIREFOX_STAGE/manifest.json" <<'PY'
import json, sys, pathlib
src = json.load(open("manifest.json"))
src.pop("minimum_chrome_version", None)
# AMO doesn't allow "key" or anything that's chrome-specific. Our manifest
# is otherwise portable.
pathlib.Path(sys.argv[1]).write_text(json.dumps(src, indent=2) + "\n")
PY
rm -f "$FIREFOX_ZIP"
( cd "$FIREFOX_STAGE" && zip -qr "../../$FIREFOX_ZIP" . )
echo "wrote $FIREFOX_ZIP ($(du -h "$FIREFOX_ZIP" | cut -f1))"

# Backwards-compat alias for the Chrome bundle (the old Action looked for
# immich-companion-<version>.zip).
ALIAS="$OUT_DIR/immich-companion-${VERSION}.zip"
cp "$CHROME_ZIP" "$ALIAS"
echo "wrote $ALIAS (alias of chrome zip)"
