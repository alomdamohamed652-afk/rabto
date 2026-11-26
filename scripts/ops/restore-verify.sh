#!/usr/bin/env bash
# Proves a dump restores: restores it into a THROWAWAY database and prints per-table row counts.
# Usage: scripts/ops/restore-verify.sh <dump-file> <scratch-db-name>
# Needs CREATEDB rights through libpq env vars. The scratch database is dropped at the end.
# It refuses names that do not start with "restore_check_", so it can never touch a real database.
set -euo pipefail
DUMP="${1:?usage: restore-verify.sh <dump-file> <scratch-db-name>}"; DB="${2:?scratch db name}"
[[ "$DB" =~ ^restore_check_[a-z0-9_]+$ ]] || { echo "scratch db name must match restore_check_[a-z0-9_]+" >&2; exit 2; }
[ -s "$DUMP" ] || { echo "dump file missing or empty" >&2; exit 2; }
dropdb --if-exists "$DB" >/dev/null 2>&1 || true
createdb "$DB"
trap 'dropdb --if-exists "$DB" >/dev/null 2>&1 || true' EXIT
pg_restore --no-owner --exit-on-error --dbname="$DB" "$DUMP"
psql -d "$DB" -Atc "select relname||'='||n_live_tup from pg_stat_user_tables order by relname" >/dev/null
for t in $(psql -d "$DB" -Atc "select tablename from pg_tables where schemaname='public' order by 1"); do echo "$t=$(psql -d "$DB" -Atc "select count(*) from \"$t\"")"; done
