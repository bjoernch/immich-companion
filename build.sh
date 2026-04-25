#!/usr/bin/env bash
# Package the extension into dist/immich-companion-<version>.zip
# ready for Chrome Web Store upload. Excludes dev files, screenshots,
# Python tooling, and dotfiles.
set -euo pipefail

cd "$(dirname "$0")"

VERSION=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
OUT_DIR="dist"
STAGE="$OUT_DIR/build"
ZIP="$OUT_DIR/immich-companion-${VERSION}.zip"

rm -rf "$STAGE"
mkdir -p "$STAGE"

cp manifest.json "$STAGE/"
cp background.js "$STAGE/"
cp content.js "$STAGE/"
cp content.css "$STAGE/"
cp LICENSE "$STAGE/"

cp -R lib "$STAGE/"
cp -R pages "$STAGE/"

mkdir -p "$STAGE/icons"
cp icons/*.png "$STAGE/icons/"

# Strip the usual cruft
find "$STAGE" -name '.DS_Store' -delete
find "$STAGE" -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null || true
find "$STAGE" -name '*.pyc' -delete

rm -f "$ZIP"
( cd "$STAGE" && zip -qr "../../$ZIP" . )

SIZE=$(du -h "$ZIP" | cut -f1)
echo "wrote $ZIP ($SIZE)"
