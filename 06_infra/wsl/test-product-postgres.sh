#!/usr/bin/env bash
set -euo pipefail
# Temporary synthetic PostgreSQL 18 data only. Never attaches to the shared product cluster.
action="${1:-}"
case "$action" in
 start)
  port="${2:?port}"
  [[ "$port" =~ ^46[0-9]{3}$ ]] || exit 2
  folder="$(mktemp -d /tmp/exportweb-pgqa-XXXXXXXX)"
  /usr/lib/postgresql/18/bin/initdb -D "$folder/data" -A trust -U exportwebqa_super --encoding=UTF8 --no-locale >"$folder/init.log"
  /usr/lib/postgresql/18/bin/pg_ctl -D "$folder/data" -l "$folder/server.log" -o "-h 127.0.0.1 -p $port -k $folder" -w start >/dev/null
  /usr/lib/postgresql/18/bin/psql -h "$folder" -p "$port" -U exportwebqa_super -d postgres -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE ROLE exportwebqa_app LOGIN NOSUPERUSER NOBYPASSRLS;
CREATE DATABASE exportwebqa OWNER exportwebqa_app;
SQL
  printf '%s\n' "$folder"
  ;;
 stop)
  folder="${2:?folder}"
  [[ "$folder" =~ ^/tmp/exportweb-pgqa-[A-Za-z0-9]{8}$ ]] || exit 2
  [[ "$(realpath "$folder")" == "$folder" ]] || exit 2
  /usr/lib/postgresql/18/bin/pg_ctl -D "$folder/data" -m fast -w stop
  # Preserve bounded test logs/data for review; no source checkout was created.
  ;;
 *) exit 2;;
esac
