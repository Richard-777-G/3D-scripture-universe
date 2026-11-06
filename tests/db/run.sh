#!/usr/bin/env bash
# Apply the schema to an empty database, load the full dataset and check it.
#   DATABASE_URL=postgres://... tests/db/run.sh   (uses that database; it must be empty)
#   tests/db/run.sh                               (starts a throwaway local Postgres)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [ -z "${DATABASE_URL:-}" ]; then
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
  TMP="$(mktemp -d)"; chmod 777 "$TMP"
  AS=(); [ "$(id -u)" = 0 ] && AS=(runuser -u postgres --)   # Postgres will not run as root
  trap '"${AS[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
  "${AS[@]}" "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "${AS[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -p 55432 -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null
  DATABASE_URL="postgresql://postgres@/postgres?host=$TMP&port=55432"
fi
PSQL=(psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1)

# Plain Postgres has no Supabase auth schema; add the two pieces the migrations use.
"${PSQL[@]}" -c "do \$\$ begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as 'select null::uuid';
  end if; end \$\$;"

for f in supabase/migrations/*.sql; do echo "migrate $f"; "${PSQL[@]}" -f "$f"; done
node pipeline/export-db.mjs build/db
(cd build/db && "${PSQL[@]}" -f load.sql)
"${PSQL[@]}" -f tests/db/check.sql
echo "database check passed"
