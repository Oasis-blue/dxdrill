#!/usr/bin/env python3
"""Full image decoder used by the visual-intake validator. Requires Pillow."""
import sys
from PIL import Image, UnidentifiedImageError

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 tools/decode-image.py <image>", file=sys.stderr)
        return 2
    try:
        with Image.open(sys.argv[1]) as image:
            image.verify()
        with Image.open(sys.argv[1]) as image:
            image.load()
            if image.width < 1 or image.height < 1:
                raise ValueError("Image has invalid dimensions.")
            if image.width > 50000 or image.height > 50000:
                raise ValueError("Image dimensions exceed the 50000-pixel safety limit.")
            print(f"{image.format} {image.width}x{image.height}")
        return 0
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        print(f"Image decode failed: {exc}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
