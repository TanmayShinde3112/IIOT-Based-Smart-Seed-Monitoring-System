"""
Prepare a quality dataset from defect folders when available.

Mappings used:
  Healthy -> Good
  Discolored -> Average
  Cracked -> Poor
  Shriveled -> Poor

Usage:
  python ml/prepare_quality_dataset.py \
    --source "../ML work/ml/data/seed_images" \
    --output "./dataset"
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


MAP = {
    "Healthy": "Good",
    "Discolored": "Average",
    "Mild Discoloration": "Average",
    "Cracked": "Poor",
    "Shriveled": "Poor",
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=str, required=True)
    parser.add_argument("--output", type=str, required=True)
    args = parser.parse_args()

    src = Path(args.source).resolve()
    out = Path(args.output).resolve()

    for cls in ["Good", "Average", "Poor"]:
        (out / cls).mkdir(parents=True, exist_ok=True)

    copied = 0
    for folder in src.iterdir():
        if not folder.is_dir():
            continue
        target = MAP.get(folder.name)
        if not target:
            continue
        for img in folder.rglob("*"):
            if img.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}:
                dst = out / target / f"{folder.name}_{img.name}"
                shutil.copy2(img, dst)
                copied += 1

    print(f"Prepared dataset at: {out}")
    print(f"Total images copied: {copied}")


if __name__ == "__main__":
    main()
