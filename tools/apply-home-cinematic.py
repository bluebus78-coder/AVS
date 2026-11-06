#!/usr/bin/env python3
"""Apply the approved homepage hero to an authoritative, complete site checkout.

The deployed site is newer than this repository's main branch. This tool changes
only the homepage hero and its two asset references, and copies only the new
homepage assets. It does not deploy the repository or overwrite shared runtimes.
"""

import argparse
from html.parser import HTMLParser
from pathlib import Path
import re
import shutil


class HeroSpan(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source = source
        self.line_offsets = [0]
        self.line_offsets.extend(match.end() for match in re.finditer("\n", source))
        self.depth = 0
        self.start = None
        self.spans = []

    def source_offset(self):
        line, column = self.getpos()
        return self.line_offsets[line - 1] + column

    def handle_starttag(self, tag, attrs):
        if tag != "section":
            return
        attributes = dict(attrs)
        classes = attributes.get("class", "").split()
        if self.depth:
            self.depth += 1
        elif "hero" in classes or "data-hc-hero" in attributes:
            self.start = self.source_offset()
            self.depth = 1

    def handle_endtag(self, tag):
        if tag != "section" or not self.depth:
            return
        self.depth -= 1
        if not self.depth:
            end = self.source.index(">", self.source_offset()) + 1
            self.spans.append((self.start, end))


def patch_homepage(source, fragment):
    parser = HeroSpan(source)
    parser.feed(source)
    if len(parser.spans) != 1 or parser.depth:
        raise ValueError("Expected exactly one complete homepage hero section")
    start, end = parser.spans[0]
    result = source[:start] + fragment.strip() + source[end:]

    def add_home_class(match):
        tag = match.group(0)
        class_match = re.search(r'\bclass\s*=\s*([\"\'])(.*?)\1', tag, re.I | re.S)
        if class_match:
            classes = class_match.group(2).split()
            if "home-cinematic" not in classes:
                classes.append("home-cinematic")
            return tag[:class_match.start(2)] + " ".join(classes) + tag[class_match.end(2):]
        return tag[:-1] + ' class="home-cinematic">'

    result, count = re.subn(r"<body\b[^>]*>", add_home_class, result, count=1, flags=re.I)
    if count != 1:
        raise ValueError("Homepage body element was not found")
    if not re.search(r'<link\b[^>]*href=[\"\']/assets/css/home-cinematic\.css(?:[?\"\'])', result, re.I):
        result, count = re.subn(r"</head\s*>", '<link rel="stylesheet" href="/assets/css/home-cinematic.css?v=20261106r1">\n</head>', result, count=1, flags=re.I)
        if count != 1:
            raise ValueError("Homepage head element was not found")
    if not re.search(r'<script\b[^>]*src=[\"\']/assets/js/home-cinematic\.js(?:[?\"\'])', result, re.I):
        result, count = re.subn(r"</body\s*>", '<script src="/assets/js/home-cinematic.js?v=20261106r1" defer></script>\n</body>', result, count=1, flags=re.I)
        if count != 1:
            raise ValueError("Homepage body closing element was not found")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True, help="Complete current site source directory")
    parser.add_argument("--write", action="store_true", help="Apply the verified patch; otherwise check only")
    args = parser.parse_args()
    bundle = Path(__file__).resolve().parent.parent
    target = args.root.resolve()
    homepage = target / "index.html"
    if not homepage.is_file():
        parser.error("--root must contain the current index.html")
    source = homepage.read_bytes().decode("utf-8")
    fragment = (bundle / "tools/home-cinematic-hero.html").read_text(encoding="utf-8")
    updated = patch_homepage(source, fragment)
    assets = (
        "assets/css/home-cinematic.css",
        "assets/js/home-cinematic.js",
        "assets/company/home-blossom.webp",
        "assets/company/dk-ai-shield-symbol.svg",
    )
    for relative in assets:
        if not (bundle / relative).is_file():
            raise FileNotFoundError(relative)
    if args.write:
        for relative in assets:
            origin, destination = bundle / relative, target / relative
            if origin.resolve() != destination.resolve():
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(origin, destination)
        homepage.write_bytes(updated.encode("utf-8"))
        print("Applied homepage hero and its assets. No deployment was performed.")
    else:
        print("Homepage patch is compatible. Re-run with --write to apply.")


if __name__ == "__main__":
    main()
