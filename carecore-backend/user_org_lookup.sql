CREATE TABLE IF NOT EXISTS user_org_lookup (
    email  text PRIMARY KEY,
    org_id text NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON user_org_lookup TO carecore;

CREATE OR REPLACE FUNCTION sync_user_org_lookup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM user_org_lookup WHERE email = OLD.email;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' AND (NEW.email <> OLD.email OR NEW.org_id <> OLD.org_id) THEN
        DELETE FROM user_org_lookup WHERE email = OLD.email;
        INSERT INTO user_org_lookup (email, org_id)
        VALUES (NEW.email, NEW.org_id)
        ON CONFLICT (email) DO UPDATE SET org_id = EXCLUDED.org_id;
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO user_org_lookup (email, org_id)
        VALUES (NEW.email, NEW.org_id)
        ON CONFLICT (email) DO UPDATE SET org_id = EXCLUDED.org_id;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_org_lookup ON auth_users;
CREATE TRIGGER trg_sync_user_org_lookup
AFTER INSERT OR UPDATE OR DELETE ON auth_users
FOR EACH ROW EXECUTE FUNCTION sync_user_org_lookup();

INSERT INTO user_org_lookup (email, org_id)
SELECT email, org_id FROM auth_users
ON CONFLICT (email) DO UPDATE SET org_id = EXCLUDED.org_id;
