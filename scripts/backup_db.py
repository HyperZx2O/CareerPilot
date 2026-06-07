#!/usr/bin/env python3
"""
Supabase DB backup script.
Dumps all tables as SQL INSERT statements via the Supabase REST API.
Usage:
    python scripts/backup_db.py [--output backup_2026-06-07.sql]
"""
import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.db.supabase_client import get_supabase_client
from backend.logger import get_logger

logger = get_logger("backup")

TABLES = [
    "users", "cvs", "cv_chunks", "applications",
    "goals", "todos", "chat_messages", "activity_log",
    "audit_log", "_migrations",
]


def backup_table(supabase, table: str) -> list[dict]:
    page = 0
    rows = []
    while True:
        resp = supabase.table(table).select("*").range(page * 1000, (page + 1) * 1000 - 1).execute()
        if not resp.data:
            break
        rows.extend(resp.data)
        if len(resp.data) < 1000:
            break
        page += 1
    return rows


def write_backup(rows_by_table: dict[str, list[dict]], output: str):
    with open(output, "w") as f:
        f.write(f"-- CareerPilot DB backup — {datetime.utcnow().isoformat()}\n\n")
        f.write("BEGIN;\n\n")
        for table, rows in rows_by_table.items():
            for row in rows:
                cols = ", ".join(row.keys())
                vals = ", ".join(
                    f"'{json.dumps(v) if isinstance(v, (dict, list)) else v}'" if v is not None else "NULL"
                    for v in row.values()
                )
                f.write(f"INSERT INTO {table} ({cols}) VALUES ({vals});\n")
            if rows:
                f.write(f"\n-- {len(rows)} rows in {table}\n\n")
        f.write("COMMIT;\n")
    logger.info("Backup written to %s", output)


def main():
    parser = argparse.ArgumentParser(description="Backup Supabase DB")
    parser.add_argument(
        "--output",
        default=f"backup_{datetime.utcnow().strftime('%Y-%m-%d')}.sql",
        help="Output SQL file path",
    )
    args = parser.parse_args()

    supabase = get_supabase_client()
    all_rows = {}
    for table in TABLES:
        try:
            rows = backup_table(supabase, table)
            all_rows[table] = rows
            logger.info("%s: %d rows", table, len(rows))
        except Exception as e:
            logger.warning("Skipping %s: %s", table, e)

    write_backup(all_rows, args.output)


if __name__ == "__main__":
    main()
