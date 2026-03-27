#!/usr/bin/env bash
# =============================================================
#  update-sitemap.sh — Update <lastmod> dates in sitemap.xml
#  Usage:
#    ./scripts/update-sitemap.sh                 # update ALL entries to today
#    ./scripts/update-sitemap.sh loan-calculator # update one tool
#    ./scripts/update-sitemap.sh about           # update a non-tool page
# =============================================================
set -euo pipefail

SITEMAP="$(cd "$(dirname "$0")/.." && pwd)/sitemap.xml"
TODAY="$(date -u +%Y-%m-%d)"

if [ ! -f "$SITEMAP" ]; then
  echo "ERROR: sitemap.xml not found at $SITEMAP" >&2
  exit 1
fi

if [ $# -eq 0 ]; then
  # Update ALL lastmod dates
  sed -i "s|<lastmod>[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}</lastmod>|<lastmod>$TODAY</lastmod>|g" "$SITEMAP"
  echo "Updated ALL lastmod entries to $TODAY in sitemap.xml"
else
  # Update only the entry matching the given slug
  SLUG="$1"
  # Use Python for context-aware replacement (sed can't easily match multi-line)
  python3 - "$SITEMAP" "$SLUG" "$TODAY" <<'PYEOF'
import sys, re

sitemap_path, slug, today = sys.argv[1], sys.argv[2], sys.argv[3]

with open(sitemap_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Match the <url> block containing the slug and replace its <lastmod>
pattern = r'(<loc>https://yourminitools\.com(?:/tools)?/' + re.escape(slug) + r'</loc>\s*<lastmod>)[^<]*(</lastmod>)'
new_content, count = re.subn(pattern, r'\g<1>' + today + r'\g<2>', content)

if count == 0:
    print(f"WARNING: no entry found for slug '{slug}' in sitemap.xml", file=sys.stderr)
    sys.exit(1)

with open(sitemap_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Updated lastmod for '{slug}' to {today} in sitemap.xml")
PYEOF
fi
