#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Set the domain name across the whole site.
#   ./set-domain.sh example.com          # use the bare domain
#   ./set-domain.sh www.example.com      # use www instead
# It rewrites every https://YOUR-DOMAIN.com reference and the CNAME file.
# ---------------------------------------------------------------------------
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: ./set-domain.sh your-domain.com" >&2
  exit 1
fi

DOMAIN="${1#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN%/}"
cd "$(dirname "$0")"

if [ -f CNAME ]; then
  CURRENT="$(grep -v '^#' CNAME | head -n1 | tr -d '[:space:]')"
  [ -z "$CURRENT" ] && CURRENT="YOUR-DOMAIN.com"
else
  CURRENT="YOUR-DOMAIN.com"
fi

echo "Replacing ${CURRENT}  ->  ${DOMAIN}"

# HTML, XML, TXT, manifest
grep -rl --include='*.html' --include='*.xml' --include='*.txt' --include='*.webmanifest' \
  -- "$CURRENT" . | while read -r f; do
  sed -i "s|${CURRENT}|${DOMAIN}|g" "$f"
done

# CNAME (GitHub Pages)
printf '%s\n' "$DOMAIN" > CNAME

echo "Done. Domain set to: ${DOMAIN}"
echo "Now: update assets/js/config.js with your phone, e-mail and WhatsApp number."
