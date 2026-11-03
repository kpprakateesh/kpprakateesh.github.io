#!/usr/bin/env bash
# ============================================================================
# AGAM — public website → Vercel
# ----------------------------------------------------------------------------
# Deploys this folder (Root Directory = site) to Vercel production.
# The private vault is NOT deployed here; see ../vault/SETUP.md.
#
#   npx vercel login       # once, or export VERCEL_TOKEN
#   ./deploy-vercel.sh
#
# Optional:
#   VERCEL_TOKEN=... ./deploy-vercel.sh
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v npx >/dev/null 2>&1; then
  echo "Node.js and npx are required." >&2
  exit 1
fi

if [ -z "${VERCEL_TOKEN:-}" ] && [ ! -f "${HOME}/.local/share/com.vercel.cli/auth.json" ] && [ ! -f "${HOME}/.vercel/auth.json" ]; then
  echo "Not signed in to Vercel. Run: npx vercel login" >&2
  echo "or set VERCEL_TOKEN before running this script." >&2
  exit 1
fi

echo "Deploying the public site to Vercel production..."
npx --yes vercel@latest deploy --prod --yes "$@"
