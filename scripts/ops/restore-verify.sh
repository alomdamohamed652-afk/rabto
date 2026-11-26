#!/usr/bin/env bash
# Proves a dump restores: restores it into a THROWAWAY database and prints per-table row counts.
# Usage: scripts/ops/restore-verify.sh <dump-file> <scratch-db-name>
# Needs CREATEDB rights through libpq env vars. The scratch database is dropped at the end.
# It refuses names that do not start with "restore_check_", so it can never touch a real database.
set -euo pipefail
DUMP="${1:?usage: restore-verify.sh <dump-file> <scratch-db-name>}"; DB="${2:?scratch db name}"
[[ "$DB" =~ ^restore_check_[a-z0-9_]+$ ]] || { echo "scratch db name must match restore_check_[a-z0-9_]+" >&2; exit 2; }
[ -s "$DUMP" ] || { echo "dump file missing or empty" >&2; exit 2; }
# It never drops a database that already exists, unless you set RABTO_RESTORE_REPLACE=1 on purpose.
EXISTS="$(psql -d postgres -Atc "select 1 from pg_database where datname='$DB'")"
if [ -n "$EXISTS" ]; then
  [ "${RABTO_RESTORE_REPLACE:-}" = "1" ] || { echo "scratch database $DB already exists; pick another name or set RABTO_RESTORE_REPLACE=1" >&2; exit 2; }
  dropdb "$DB"
fi
echo "restoring into scratch database $DB on host ${PGHOST:-local socket}" >&2
createdb "$DB"
trap 'dropdb --if-exists "$DB" >/dev/null 2>&1 || true' EXIT
pg_restore --no-owner --exit-on-error --dbname="$DB" "$DUMP"
psql -d "$DB" -Atc "select relname||'='||n_live_tup from pg_stat_user_tables order by relname" >/dev/null
TABLES="$(psql -d "$DB" -Atc "select tablename from pg_tables where schemaname='public' order by 1")"
for t in $TABLES; do echo "$t=$(psql -d "$DB" -Atc "select count(*) from \"$t\"")"; done
