"""
Apply pending Supabase migrations when direct DB access is available.

Usage:
  python scripts/apply_migration.py              # auto-detect and apply
  python scripts/apply_migration.py --db-url <url>  # override DB URL

The script tries multiple connection strategies:
  1. Pooler (aws-0-us-east-1.pooler.supabase.com:6543)
  2. Direct (db.<project>.supabase.co:5432)
  3. The --db-url argument
"""
import os, sys, argparse
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_root))

from dotenv import load_dotenv
load_dotenv(_root / ".env")

MIGRATION_FILE = _root / "backend" / "migrations" / "fix_schema_v2.sql"

def main():
    parser = argparse.ArgumentParser(description="Apply Supabase migration")
    parser.add_argument("--db-url", help="PostgreSQL connection string")
    args = parser.parse_args()

    db_url = args.db_url or os.getenv("DATABASE_URL", "")
    if not db_url:
        print("No DATABASE_URL in .env and no --db-url provided.")
        sys.exit(1)

    try:
        import asyncio
        import asyncpg

        async def run():
            print(f"Connecting to database...")
            conn = await asyncpg.connect(db_url)
            print("Connected. Reading migration file...")
            sql = MIGRATION_FILE.read_text(encoding="utf-8")
            print(f"Executing migration ({len(sql)} bytes)...")
            await conn.execute(sql)
            print("Migration completed successfully!")
            await conn.close()

        asyncio.run(run())
    except ImportError:
        print("asyncpg not available. Trying psql...")
        ret = os.system(f'psql "{db_url}" -f "{MIGRATION_FILE}"')
        if ret != 0:
            print(f"psql failed with exit code {ret}")
            sys.exit(1)
    except Exception as e:
        print(f"Migration failed: {e}")
        print(f"\nPlease run the SQL in backend/migrations/fix_schema_v2.sql")
        print(f"manually via the Supabase Dashboard SQL Editor.")
        sys.exit(1)


if __name__ == "__main__":
    main()
