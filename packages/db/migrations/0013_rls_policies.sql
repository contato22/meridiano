-- Multi-tenant isolation via Row-Level Security tied to Clerk JWT.
-- Supabase populates `request.jwt.claim.sub` with the Clerk user id; we
-- resolve it to the user's organization via the memberships table.

CREATE OR REPLACE FUNCTION auth_clerk_user_id()
RETURNS VARCHAR
LANGUAGE SQL STABLE
AS $$
    SELECT current_setting('request.jwt.claim.sub', true);
$$;

CREATE OR REPLACE FUNCTION auth_user_org_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
    SELECT m.organization_id
      FROM memberships m
      JOIN users u ON u.id = m.user_id
     WHERE u.clerk_user_id = current_setting('request.jwt.claim.sub', true)
       AND m.status = 'ACTIVE'
       AND u.deleted_at IS NULL
     LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS VARCHAR
LANGUAGE SQL STABLE
AS $$
    SELECT m.role
      FROM memberships m
      JOIN users u ON u.id = m.user_id
     WHERE u.clerk_user_id = current_setting('request.jwt.claim.sub', true)
       AND m.status = 'ACTIVE'
     LIMIT 1;
$$;

-- Enable RLS on every multi-tenant table.
-- FORCE ensures policies apply even to the table owner — without this PGlite
-- tests would silently bypass RLS (and any future admin connecting as the
-- schema owner in production would as well). Supabase runs the app as the
-- `authenticated` role, so this is also a defence against a misconfigured
-- connection string accidentally going via the owner.
ALTER TABLE organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations    FORCE ROW LEVEL SECURITY;
ALTER TABLE workspaces       ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces       FORCE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            FORCE ROW LEVEL SECURITY;
ALTER TABLE memberships      ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships      FORCE ROW LEVEL SECURITY;
ALTER TABLE entities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities         FORCE ROW LEVEL SECURITY;
ALTER TABLE accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts         FORCE ROW LEVEL SECURITY;
ALTER TABLE transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions     FORCE ROW LEVEL SECURITY;
ALTER TABLE entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries          FORCE ROW LEVEL SECURITY;
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balances FORCE ROW LEVEL SECURITY;

-- Org-scoped tables: visible only to members of the caller's org.
CREATE POLICY org_isolation ON organizations
    FOR ALL USING (id = auth_user_org_id());

CREATE POLICY workspace_org_isolation ON workspaces
    FOR ALL USING (organization_id = auth_user_org_id());

CREATE POLICY membership_org_isolation ON memberships
    FOR ALL USING (organization_id = auth_user_org_id());

CREATE POLICY entity_org_isolation ON entities
    FOR ALL USING (organization_id = auth_user_org_id());

CREATE POLICY account_org_isolation ON accounts
    FOR ALL USING (organization_id = auth_user_org_id());

CREATE POLICY transaction_org_isolation ON transactions
    FOR ALL USING (organization_id = auth_user_org_id());

CREATE POLICY entry_via_transaction ON entries
    FOR ALL USING (
        transaction_id IN (
            SELECT id FROM transactions WHERE organization_id = auth_user_org_id()
        )
    );

CREATE POLICY balance_via_account ON account_balances
    FOR ALL USING (
        account_id IN (
            SELECT id FROM accounts WHERE organization_id = auth_user_org_id()
        )
    );

-- Users: see only themselves (admins / OWNERs get a broader policy added later
-- when team admin UI lands).
CREATE POLICY users_self ON users
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claim.sub', true));

-- AUDITOR enforcement: read-only on every mutable table. Listed per-table to
-- preserve plan readability.
CREATE POLICY auditor_no_write_entities ON entities
    FOR INSERT WITH CHECK (auth_user_role() != 'AUDITOR');
CREATE POLICY auditor_no_update_entities ON entities
    FOR UPDATE USING (auth_user_role() != 'AUDITOR');
CREATE POLICY auditor_no_delete_entities ON entities
    FOR DELETE USING (auth_user_role() != 'AUDITOR');

CREATE POLICY auditor_no_write_accounts ON accounts
    FOR INSERT WITH CHECK (auth_user_role() != 'AUDITOR');
CREATE POLICY auditor_no_update_accounts ON accounts
    FOR UPDATE USING (auth_user_role() != 'AUDITOR');
CREATE POLICY auditor_no_delete_accounts ON accounts
    FOR DELETE USING (auth_user_role() != 'AUDITOR');

CREATE POLICY auditor_no_write_transactions ON transactions
    FOR INSERT WITH CHECK (auth_user_role() != 'AUDITOR');
CREATE POLICY auditor_no_write_entries ON entries
    FOR INSERT WITH CHECK (auth_user_role() != 'AUDITOR');
