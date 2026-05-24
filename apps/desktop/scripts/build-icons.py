#!/opt/homebrew/bin/python3
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ICON = ROOT / "public" / "favicon.svg"
OUTPUT_DIR = ROOT / "assets" / "icons"
ICONSET_DIR = OUTPUT_DIR / "icon.iconset"

PNG_SIZES = [
    16,
    32,
    64,
    128,
    256,
    512,
    1024,
]

ICONSET_FILES = {
    "icon_16x16.png": 16,
    "icon_16x16@2x.png": 32,
    "icon_32x32.png": 32,
    "icon_32x32@2x.png": 64,
    "icon_128x128.png": 128,
    "icon_128x128@2x.png": 256,
    "icon_256x256.png": 256,
    "icon_256x256@2x.png": 512,
    "icon_512x512.png": 512,
    "icon_512x512@2x.png": 1024,
}


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if ICONSET_DIR.exists():
        shutil.rmtree(ICONSET_DIR)
    ICONSET_DIR.mkdir(parents=True, exist_ok=True)

    base_png = OUTPUT_DIR / "icon.png"
    run("sips", "-s", "format", "png", str(PUBLIC_ICON), "--out", str(base_png))
    run("sips", "-z", "512", "512", str(base_png), "--out", str(base_png))

    tray_png = OUTPUT_DIR / "trayTemplate.png"
    run("sips", "-z", "18", "18", str(base_png), "--out", str(tray_png))

    for size in PNG_SIZES:
      sized_png = OUTPUT_DIR / f"icon-{size}.png"
      run("sips", "-z", str(size), str(size), str(base_png), "--out", str(sized_png))

    for file_name, size in ICONSET_FILES.items():
        run(
            "sips",
            "-z",
            str(size),
            str(size),
            str(base_png),
            "--out",
            str(ICONSET_DIR / file_name),
        )

    run("iconutil", "-c", "icns", str(ICONSET_DIR), "-o", str(OUTPUT_DIR / "icon.icns"))
    run(
        "node",
        str(ROOT / "scripts" / "write-ico.mjs"),
        str(OUTPUT_DIR / "icon-16.png"),
        str(OUTPUT_DIR / "icon-32.png"),
        str(OUTPUT_DIR / "icon-64.png"),
        str(OUTPUT_DIR / "icon-128.png"),
        str(OUTPUT_DIR / "icon-256.png"),
        str(OUTPUT_DIR / "icon.ico"),
    )


if __name__ == "__main__":
    main()
