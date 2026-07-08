first run two query

CREATE ROLE carecore LOGIN PASSWORD 'SoftwareLighthouseASDF';

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO carecore;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO carecore;



#Problem#
2026/07/01 16:33:00 D:/projects/carecoreai/carecore-backend/db/db.go:110 ERROR: must be owner of table organisations (SQLSTATE 42501)
[0.520ms] [rows:0] ALTER TABLE "organisations" ALTER COLUMN "settings" SET DEFAULT '{}'
2026/07/01 16:33:00 Migration failed: ERROR: must be owner of table organisations (SQLSTATE 42501)
exit status 1


This error occurs because the backend is connecting to the database using the carecore user 


1. Transfer Table Ownership
Run the following block to transfer ownership of all tables to carecore (

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I OWNER TO carecore', r.tablename);
    END LOOP;
END $$;

2. Transfer Sequence Ownership

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('ALTER SEQUENCE public.%I OWNER TO carecore', r.sequence_name);
    END LOOP;
END $$;
