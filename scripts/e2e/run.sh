#!/usr/bin/env bash
# Isolated RABTO end-to-end runner. TEST ONLY. Creates a throwaway local Postgres
# in a temp dir on 127.0.0.1, applies drizzle migrations, seeds a test admin,
# starts the built app, runs one flow script, then stops only what it started.
# Usage: RABTO_E2E=1 scripts/e2e/run.sh flow2.mjs   (needs npm run build first)
set -euo pipefail
[ "${RABTO_E2E:-}" = "1" ] || { echo "Refusing: set RABTO_E2E=1 (test-only harness)."; exit 2; }
RABTO_DIR="${RABTO_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
HERE="$(cd "$(dirname "$0")" && pwd)"
FLOW="${1:?usage: run.sh <flow-script.mjs>}"
PORT_DB="${E2E_DB_PORT:-54330}"; PORT_APP="${E2E_APP_PORT:-3111}"
[ -n "${PGBIN:-}" ] && export PATH="$PGBIN:$PATH"
command -v initdb >/dev/null || { echo "initdb not found; set PGBIN to a Postgres 16 bin dir."; exit 2; }
TMP="$(mktemp -d /tmp/rabto-e2e.XXXXXX)"
APP_PID=""
cleanup() {
  if [ -n "$APP_PID" ]; then pkill -P "$APP_PID" 2>/dev/null || true; kill "$APP_PID" 2>/dev/null || true; fi
  pg_ctl -D "$TMP/pgdata" stop -m fast >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT
initdb -D "$TMP/pgdata" -U postgres -A trust >/dev/null
pg_ctl -D "$TMP/pgdata" -o "-p $PORT_DB -k $TMP -c listen_addresses=127.0.0.1" -l "$TMP/pg.log" -w start >/dev/null
export PGHOST=127.0.0.1 PGPORT="$PORT_DB" PGUSER=postgres
createdb rabto_e2e
for f in "$RABTO_DIR"/drizzle/*.sql; do
  sed 's/--> statement-breakpoint//' "$f" | psql -q -v ON_ERROR_STOP=1 rabto_e2e >/dev/null
done
HASH="$(cd "$HERE" && node -e "import('./seed.mjs').then(m=>console.log(m.hash('Admin-Test-Pass-123')))")"
psql -q rabto_e2e -c "insert into users (email,password_hash,platform_role) values ('admin@test.local','$HASH','admin')"
export SESSION_SECRET="test-only-secret-test-only-secret-123"
export ANALYTICS_CONSUMER_SECRET="e2e-analytics-secret-0123456789abcdef"
export DATABASE_URL="postgres://postgres@127.0.0.1:$PORT_DB/rabto_e2e"
export RABTO_E2E_ALLOW_SINK=1 RABTO_MAIL_SINK_FILE="$TMP/mail.jsonl" E2E_MAIL_SINK="$TMP/mail.jsonl"
[ "${E2E_NO_SINK:-}" = 1 ] && unset RABTO_MAIL_SINK_FILE RABTO_E2E_ALLOW_SINK
export E2E_BASE_URL="http://127.0.0.1:$PORT_APP"
(cd "$RABTO_DIR" && exec node node_modules/next/dist/bin/next start -p "$PORT_APP" >"$TMP/next.log" 2>&1) &
APP_PID=$!
for _ in $(seq 1 40); do curl -s -o /dev/null "$E2E_BASE_URL/login" && break; sleep 1; done
(cd "$HERE" && node "$FLOW")
