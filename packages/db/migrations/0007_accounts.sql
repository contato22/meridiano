-- Chart of accounts. Lives inside a workspace; consumed by the ledger.
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Human-readable account code, e.g. "1.1.01" for Caixa, "4.1.01" for Aluguel.
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,

    type VARCHAR(20) NOT NULL CHECK (type IN (
        'asset',
        'liability',
        'equity',
        'revenue',
        'expense'
    )),

    -- ISO 4217 currency code. Must match the currency of every entry that lands
    -- on this account (enforced at the entries table, see 0009).
    currency CHAR(3) NOT NULL,

    -- For drill-down / hierarchical charts. Parent must live in the same workspace.
    parent_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,

    -- Archived accounts cannot receive new entries but historical rows stay queryable.
    archived_at TIMESTAMPTZ,

    metadata JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (workspace_id, code)
);

CREATE INDEX idx_accounts_workspace ON accounts(workspace_id);
CREATE INDEX idx_accounts_org ON accounts(organization_id);
CREATE INDEX idx_accounts_parent ON accounts(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_accounts_active ON accounts(workspace_id) WHERE archived_at IS NULL;

CREATE TRIGGER accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
