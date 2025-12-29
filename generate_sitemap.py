#!/usr/bin/env python3
"""Generate sitemap.xml for this static site.

What is it?
  A sitemap.xml is a machine-readable list of URLs on your site.
  Search engines use it to discover pages reliably (especially pages that
  are not linked from plain HTML, or are linked only via JavaScript).

This script scans the HTML files in this folder (including stocks/*.html)
and writes a sitemap.xml with absolute URLs.

Usage:
    # Run with defaults (good for VS Code “Run Python File”)
    python generate_sitemap.py

    # Or override the domain
    python generate_sitemap.py --base-url https://your-domain.com

Notes:
  - Cloudflare Pages will serve sitemap.xml at https://your-domain.com/sitemap.xml
    if you commit the generated file to the repo output.
"""

from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path
from urllib.parse import urljoin


SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"


def _normalize_base_url(base_url: str) -> str:
    base = (base_url or "").strip()
    if not base:
        raise SystemExit("--base-url is required (e.g. https://example.com)")
    if not (base.startswith("http://") or base.startswith("https://")):
        raise SystemExit("--base-url must start with http:// or https://")
    # Ensure trailing slash for safe urljoin behavior
    if not base.endswith("/"):
        base += "/"
    return base


def _should_include(path: Path, site_root: Path) -> bool:
    if not path.is_file():
        return False
    if path.suffix.lower() != ".html":
        return False

    rel = path.relative_to(site_root).as_posix()

    # Skip development/unused folders if they appear
    if rel.startswith(("node_modules/", ".git/", "__pycache__/")):
        return False

    # Optional: you can exclude stock-details.html because it's the JS-driven template.
    # Keeping it is fine, but the prerendered /stocks/* pages are what you want indexed.
    return True


def _iter_html_pages(site_root: Path) -> list[Path]:
    pages: list[Path] = []
    for path in site_root.rglob("*.html"):
        if _should_include(path, site_root):
            pages.append(path)

    # Stable ordering (root pages first, then deeper)
    pages.sort(key=lambda p: (len(p.relative_to(site_root).parts), p.as_posix()))
    return pages


def _iso_date_from_mtime(path: Path) -> str:
    ts = path.stat().st_mtime
    d = dt.datetime.fromtimestamp(ts, tz=dt.timezone.utc).date()
    return d.isoformat()


def _xml_escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def build_sitemap_xml(site_root: Path, base_url: str, include_lastmod: bool) -> str:
    base = _normalize_base_url(base_url)
    pages = _iter_html_pages(site_root)

    lines: list[str] = []
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    lines.append(f'<urlset xmlns="{SITEMAP_NS}">')

    for page in pages:
        rel = page.relative_to(site_root).as_posix()
        # Keep /index.html explicit (fine), but also allow root discovery.
        loc = urljoin(base, rel)
        lines.append("  <url>")
        lines.append(f"    <loc>{_xml_escape(loc)}</loc>")
        if include_lastmod:
            lines.append(f"    <lastmod>{_iso_date_from_mtime(page)}</lastmod>")
        lines.append("  </url>")

    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate sitemap.xml for HTML_portfolio"
    )
    parser.add_argument(
        "--base-url",
        default="https://bayesdemon.com",
        help="Site base URL, e.g. https://your-domain.com (default: https://bayedeamon.com)",
    )
    parser.add_argument(
        "--out",
        default="sitemap.xml",
        help="Output path relative to this folder (default: sitemap.xml)",
    )
    parser.add_argument(
        "--no-lastmod",
        action="store_true",
        help="Do not include <lastmod> tags",
    )

    args = parser.parse_args()

    site_root = Path(__file__).resolve().parent
    out_path = (site_root / args.out).resolve()

    xml = build_sitemap_xml(
        site_root, args.base_url, include_lastmod=not args.no_lastmod
    )
    out_path.write_text(xml, encoding="utf-8")

    print(f"Wrote: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
