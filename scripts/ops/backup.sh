#!/usr/bin/env bash
# Logical backup of the RABTO database (pg_dump custom format). No host or provider is assumed.
# Usage: DATABASE_URL=postgres://... scripts/ops/backup.sh <output-dir> [keep-count]
# Uses libpq env vars (PGHOST, PGPORT, PGUSER, PGDATABASE) when DATABASE_URL is not set.
# The dump contains customer data: store it encrypted and access-controlled. Never commit it.
set -euo pipefail
OUT="${1:?usage: backup.sh <output-dir> [keep-count]}"; KEEP="${2:-14}"
[[ "$KEEP" =~ ^[0-9]+$ ]] && [ "$KEEP" -ge 1 ] || { echo "keep-count must be a positive integer" >&2; exit 2; }
mkdir -p "$OUT"; chmod 700 "$OUT"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"; FILE="$OUT/rabto-$STAMP-$$.dump"
umask 077
rm -f -- "$FILE"
trap 'rc=$?; [ "$rc" -eq 0 ] || rm -f -- "$FILE"' EXIT
# Note: a DATABASE_URL is passed as an argument, so other users on the same machine may see it in the process list.
# On a shared host prefer the libpq variables (PGHOST, PGUSER, PGPASSFILE) and leave DATABASE_URL unset.
if [ -n "${DATABASE_URL:-}" ]; then pg_dump --format=custom --no-owner --file="$FILE" "$DATABASE_URL"; else pg_dump --format=custom --no-owner --file="$FILE"; fi
chmod 600 "$FILE"
[ -s "$FILE" ] || { echo "backup is empty" >&2; rm -f "$FILE"; exit 1; }
pg_restore --list "$FILE" >/dev/null
# Keep only the newest KEEP dumps made by this script.
ls -1t "$OUT"/rabto-*.dump 2>/dev/null | tail -n +"$((KEEP+1))" | while IFS= read -r old; do rm -f -- "$old"; done
echo "$FILE"
