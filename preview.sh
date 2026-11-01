#!/usr/bin/env bash
# Local preview: http://localhost:8080
cd "$(dirname "$0")"
PORT="${1:-8080}"
echo "Serving $(pwd) at http://localhost:${PORT}  (Ctrl+C to stop)"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
