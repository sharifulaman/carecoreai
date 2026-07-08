-- Run this after every schema change / new model addition.
-- Finds any table with an org_id column that is missing the
-- tenant_isolation RLS policy, and creates it. Idempotent — safe
-- to run repeatedly, only touches tables that are missing coverage.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.table_name
        FROM information_schema.columns c
        WHERE c.column_name = 'org_id'
          AND c.table_schema = 'public'
          AND NOT EXISTS (
            SELECT 1 FROM pg_policies p
            WHERE p.schemaname = 'public'
              AND p.tablename = c.table_name
              AND p.policyname = 'tenant_isolation'
          )
    LOOP
        RAISE NOTICE 'Applying RLS to table missing coverage: %', r.table_name;
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', r.table_name);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', r.table_name);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());',
            r.table_name
        );
    END LOOP;
END $$;

-- Verify: should return zero rows after running the above.
SELECT c.table_name
FROM information_schema.columns c
WHERE c.column_name = 'org_id'
  AND c.table_schema = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = c.table_name
      AND p.policyname = 'tenant_isolation'
  );