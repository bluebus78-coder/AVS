#!/usr/bin/env python3
"""Build a homepage preview whose navigation opens the current production pages."""
from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
source = (root / "index.html").read_bytes().decode("utf-8")

def production_links(match):
    tag = match.group(0)
    return re.sub(r'(\bhref\s*=\s*[\"\'])(/[^\"\']*)',
                  r'\1https://www.alphavipertrading.com\2', tag, flags=re.I)

preview = re.sub(r'<a\b[^>]*>', production_links, source, flags=re.I)
preview = preview.replace('</head>', '<meta name="robots" content="noindex,nofollow">\n</head>', 1)
(root / "home-cinematic-preview.html").write_bytes(preview.encode("utf-8"))
print("Built home-cinematic-preview.html")
