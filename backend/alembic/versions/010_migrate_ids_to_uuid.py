"""Migrate all IDs from Integer to UUID.

Revision ID: 010
Revises: 009
Create Date: 2026-02-09

IMPORTANT: Make a full database backup before running this migration!

This migration dynamically discovers ALL tables with integer PKs and ALL FK
relationships in the database, so it handles tables that may not have
corresponding SQLAlchemy models.
"""
from alembic import op

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ==================================================================
    # PHASE 0: Enable pgcrypto extension
    # ==================================================================
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    # ==================================================================
    # PHASE 1: Discover all tables with integer PK named 'id'
    # Store in temp table for use throughout the migration.
    # ==================================================================
    op.execute("""
        CREATE TEMP TABLE _mig_tables AS
        SELECT DISTINCT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.table_constraints tc
            ON c.table_name = tc.table_name
            AND c.table_schema = tc.table_schema
            AND tc.constraint_type = 'PRIMARY KEY'
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
            AND kcu.column_name = 'id'
        WHERE c.column_name = 'id'
            AND c.data_type IN ('integer', 'bigint')
            AND c.table_schema = 'public'
    """)

    # ==================================================================
    # PHASE 2: Discover ALL FK constraints referencing these tables
    # ==================================================================
    op.execute("""
        CREATE TEMP TABLE _mig_fks AS
        SELECT DISTINCT
            tc.constraint_name,
            kcu.table_name AS child_table,
            kcu.column_name AS child_column,
            ccu.table_name AS parent_table,
            rc.delete_rule,
            col.is_nullable
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
            AND tc.table_schema = ccu.table_schema
        JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
            AND tc.table_schema = rc.constraint_schema
        JOIN information_schema.columns col
            ON col.table_name = kcu.table_name
            AND col.column_name = kcu.column_name
            AND col.table_schema = 'public'
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name IN (SELECT table_name FROM _mig_tables)
            AND ccu.column_name = 'id'
            AND tc.table_schema = 'public'
    """)

    # ==================================================================
    # PHASE 3: Save UNIQUE constraints on FK columns (to restore later)
    # Group all columns per constraint to handle composite unique keys.
    # ==================================================================
    op.execute("""
        CREATE TEMP TABLE _mig_unique AS
        SELECT tc.constraint_name,
               tc.table_name,
               string_agg(kcu.column_name, ',' ORDER BY kcu.ordinal_position) AS columns
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
            AND tc.table_schema = 'public'
            AND tc.constraint_name IN (
                SELECT tc2.constraint_name
                FROM information_schema.table_constraints tc2
                JOIN information_schema.key_column_usage kcu2
                    ON tc2.constraint_name = kcu2.constraint_name
                    AND tc2.table_schema = kcu2.table_schema
                WHERE tc2.constraint_type = 'UNIQUE'
                    AND tc2.table_schema = 'public'
                    AND EXISTS (
                        SELECT 1 FROM _mig_fks f
                        WHERE f.child_table = tc2.table_name
                        AND f.child_column = kcu2.column_name
                    )
            )
        GROUP BY tc.constraint_name, tc.table_name
    """)

    # ==================================================================
    # PHASE 4: Save non-PK indexes that reference migrating columns
    # (they will be auto-dropped when columns are dropped)
    # ==================================================================
    op.execute("""
        CREATE TEMP TABLE _mig_indexes AS
        SELECT i.indexname, i.tablename, i.indexdef
        FROM pg_indexes i
        WHERE i.schemaname = 'public'
            AND i.indexname NOT IN (
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE constraint_type IN ('PRIMARY KEY', 'UNIQUE')
                    AND table_schema = 'public'
            )
            AND (
                EXISTS (
                    SELECT 1 FROM _mig_fks f
                    WHERE f.child_table = i.tablename
                    AND i.indexdef LIKE '%' || f.child_column || '%'
                )
                OR (
                    i.tablename IN (SELECT table_name FROM _mig_tables)
                    AND i.indexdef LIKE '%(id)%'
                )
            )
    """)

    # ==================================================================
    # PHASE 5: Add new_uuid column to ALL discovered tables
    # ==================================================================
    op.execute("""
        DO $$
        DECLARE r RECORD;
        BEGIN
            FOR r IN SELECT table_name FROM _mig_tables LOOP
                EXECUTE format(
                    'ALTER TABLE %I ADD COLUMN new_uuid UUID NOT NULL DEFAULT gen_random_uuid()',
                    r.table_name
                );
            END LOOP;
        END $$;
    """)

    # ==================================================================
    # PHASE 6: Add new UUID FK columns and populate via JOINs
    # ==================================================================
    op.execute("""
        DO $$
        DECLARE r RECORD;
        BEGIN
            FOR r IN SELECT * FROM _mig_fks LOOP
                -- Add new UUID FK column
                EXECUTE format(
                    'ALTER TABLE %I ADD COLUMN %I UUID',
                    r.child_table, 'new_' || r.child_column
                );
                -- Populate via JOIN with parent table
                EXECUTE format(
                    'UPDATE %I t SET %I = p.new_uuid FROM %I p WHERE t.%I = p.id',
                    r.child_table, 'new_' || r.child_column,
                    r.parent_table, r.child_column
                );
                -- Set NOT NULL if original was NOT NULL
                IF r.is_nullable = 'NO' THEN
                    EXECUTE format(
                        'ALTER TABLE %I ALTER COLUMN %I SET NOT NULL',
                        r.child_table, 'new_' || r.child_column
                    );
                END IF;
            END LOOP;
        END $$;
    """)

    # ==================================================================
    # PHASE 7: Drop UNIQUE constraints on FK columns
    # ==================================================================
    op.execute("""
        DO $$
        DECLARE r RECORD;
        BEGIN
            FOR r IN SELECT * FROM _mig_unique LOOP
                EXECUTE format(
                    'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
                    r.table_name, r.constraint_name
                );
            END LOOP;
        END $$;
    """)

    # ==================================================================
    # PHASE 8: Drop ALL FK constraints
    # ==================================================================
    op.execute("""
        DO $$
        DECLARE r RECORD;
        BEGIN
            FOR r IN SELECT constraint_name, child_table FROM _mig_fks LOOP
                EXECUTE format(
                    'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
                    r.child_table, r.constraint_name
                );
            END LOOP;
        END $$;
    """)

    # ==================================================================
    # PHASE 9: Drop PK constraints on all migrating tables
    # ==================================================================
    op.execute("""
        DO $$
        DECLARE r RECORD;
        BEGIN
            FOR r IN SELECT table_name FROM _mig_tables LOOP
                EXECUTE format(
                    'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
                    r.table_name, r.table_name || '_pkey'
                );
            END LOOP;
        END $$;
    """)

    # ==================================================================
    # PHASE 10: Drop old integer FK columns
    # (this auto-drops indexes that reference these columns)
    # ==================================================================
    op.execute("""
        DO $$
        DECLARE r RECORD;
        BEGIN
            FOR r IN SELECT child_table, child_column FROM _mig_fks LOOP
                EXECUTE format(
                    'ALTER TABLE %I DROP COLUMN IF EXISTS %I',
                    r.child_table, r.child_column
                );
            END LOOP;
        END $$;
    """)

    # ==================================================================
    # PHASE 11: Drop old integer id columns
    # (this auto-drops sequences and remaining indexes)
    # ==================================================================
    op.execute("""
        DO $$
        DECLARE r RECORD;
        BEGIN
            FOR r IN SELECT table_name FROM _mig_tables LOOP
                EXECUTE format(
                    'ALTER TABLE %I DROP COLUMN id',
                    r.table_name
                );
            END LOOP;
        END $$;
    """)

    # ==================================================================
    # PHASE 12: Rename new columns to final names
    # ==================================================================
    op.execute("""
        DO $$
        DECLARE r RECORD;
        BEGIN
            -- Rename PKs: new_uuid -> id
            FOR r IN SELECT table_name FROM _mig_tables LOOP
                EXECUTE format(
                    'ALTER TABLE %I RENAME COLUMN new_uuid TO id',
                    r.table_name
                );
            END LOOP;

            -- Rename FKs: new_{col} -> {col}
            FOR r IN SELECT child_table, child_column FROM _mig_fks LOOP
                EXECUTE format(
                    'ALTER TABLE %I RENAME COLUMN %I TO %I',
                    r.child_table, 'new_' || r.child_column, r.child_column
                );
            END LOOP;
        END $$;
    """)

    # ==================================================================
    # PHASE 13: Add PK constraints
    # ==================================================================
    op.execute("""
        DO $$
        DECLARE r RECORD;
        BEGIN
            FOR r IN SELECT table_name FROM _mig_tables LOOP
                EXECUTE format(
                    'ALTER TABLE %I ADD CONSTRAINT %I PRIMARY KEY (id)',
                    r.table_name, r.table_name || '_pkey'
                );
            END LOOP;
        END $$;
    """)

    # ==================================================================
    # PHASE 14: Add FK constraints (preserving ON DELETE rules)
    # ==================================================================
    op.execute("""
        DO $$
        DECLARE r RECORD; on_del TEXT;
        BEGIN
            FOR r IN SELECT * FROM _mig_fks LOOP
                on_del := '';
                IF r.delete_rule = 'CASCADE' THEN
                    on_del := ' ON DELETE CASCADE';
                ELSIF r.delete_rule = 'SET NULL' THEN
                    on_del := ' ON DELETE SET NULL';
                ELSIF r.delete_rule = 'SET DEFAULT' THEN
                    on_del := ' ON DELETE SET DEFAULT';
                END IF;

                EXECUTE format(
                    'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(id)%s',
                    r.child_table, r.constraint_name, r.child_column,
                    r.parent_table, on_del
                );
            END LOOP;
        END $$;
    """)

    # ==================================================================
    # PHASE 15: Restore UNIQUE constraints on FK columns
    # Uses the grouped columns string (e.g. "user_id,role_id")
    # ==================================================================
    op.execute("""
        DO $$
        DECLARE r RECORD;
        BEGIN
            FOR r IN SELECT * FROM _mig_unique LOOP
                EXECUTE format(
                    'ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (' || r.columns || ')',
                    r.table_name, r.constraint_name
                );
            END LOOP;
        END $$;
    """)

    # ==================================================================
    # PHASE 16: Recreate saved indexes (with UUID column types)
    # ==================================================================
    op.execute("""
        DO $$
        DECLARE r RECORD; idx_def TEXT;
        BEGIN
            FOR r IN SELECT * FROM _mig_indexes LOOP
                -- The original index definition references old column types
                -- but the column names are the same, so we can just re-execute
                BEGIN
                    EXECUTE r.indexdef;
                EXCEPTION WHEN others THEN
                    RAISE NOTICE 'Could not recreate index %: %', r.indexname, SQLERRM;
                END;
            END LOOP;
        END $$;
    """)

    # ==================================================================
    # PHASE 17: Remove DEFAULT from id columns (managed by SQLAlchemy)
    # ==================================================================
    op.execute("""
        DO $$
        DECLARE r RECORD;
        BEGIN
            FOR r IN SELECT table_name FROM _mig_tables LOOP
                EXECUTE format(
                    'ALTER TABLE %I ALTER COLUMN id DROP DEFAULT',
                    r.table_name
                );
            END LOOP;
        END $$;
    """)

    # ==================================================================
    # CLEANUP: Drop temp tables
    # ==================================================================
    op.execute("DROP TABLE IF EXISTS _mig_indexes")
    op.execute("DROP TABLE IF EXISTS _mig_unique")
    op.execute("DROP TABLE IF EXISTS _mig_fks")
    op.execute("DROP TABLE IF EXISTS _mig_tables")


def downgrade() -> None:
    raise NotImplementedError(
        "Downgrade from UUID to Integer is not supported. "
        "Restore from database backup if needed."
    )
