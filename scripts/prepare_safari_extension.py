#!/usr/bin/env python3
"""Prepare a Safari-friendly extension bundle in-place.

- Inlines lib/browser-name.js + lib/immich.js into background.js
- Strips ES module import/export syntax for Safari's non-module background
- Removes background.type from manifest.json

Run this only on a staged copy (e.g. the Safari converter input).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

MARKER = "// SAFARI_BACKGROUND_BUNDLE"


def strip_exports(text: str) -> str:
    out: list[str] = []
    for line in text.splitlines():
        if re.match(r"^\s*export\s*\{", line):
            continue
        line = re.sub(r"^(\s*)export\s+", r"\1", line)
        out.append(line)
    return "\n".join(out).rstrip() + "\n"


def strip_imports(text: str) -> str:
    out: list[str] = []
    skipping = False
    for line in text.splitlines():
        if not skipping and line.lstrip().startswith("import "):
            skipping = True
            if ";" in line:
                skipping = False
            continue
        if skipping:
            if ";" in line:
                skipping = False
            continue
        out.append(line)
    return "\n".join(out).lstrip("\n") + "\n"


def bundle_background(root: Path) -> None:
    background_path = root / "background.js"
    if not background_path.exists():
        raise FileNotFoundError(f"Missing {background_path}")

    background_text = background_path.read_text()
    if MARKER in background_text:
        return

    lib_paths = [
        root / "lib" / "browser-name.js",
        root / "lib" / "immich.js",
    ]
    for path in lib_paths:
        if not path.exists():
            raise FileNotFoundError(f"Missing {path}")

    parts: list[str] = [MARKER]
    for path in lib_paths:
        rel = path.relative_to(root)
        parts.append(f"// --- {rel} ---\n{strip_exports(path.read_text())}")

    parts.append(f"// --- background.js ---\n{strip_imports(background_text)}")
    background_path.write_text("\n".join(parts))


def patch_manifest(root: Path) -> None:
    manifest_path = root / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"Missing {manifest_path}")

    data = json.loads(manifest_path.read_text())
    bg = data.get("background")
    if isinstance(bg, dict) and "type" in bg:
        bg = dict(bg)
        bg.pop("type", None)
        data["background"] = bg
        manifest_path.write_text(json.dumps(data, indent=2) + "\n")


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: prepare_safari_extension.py <extension_root>")
        return 2
    root = Path(sys.argv[1]).resolve()
    if not root.exists():
        print(f"Path not found: {root}")
        return 2

    bundle_background(root)
    patch_manifest(root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
