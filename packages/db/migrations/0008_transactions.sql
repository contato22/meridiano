-- Transaction header. The body lives in `entries` (one row per debit/credit leg).
-- The pair (transactions + entries) is the canonical double-entry ledger.
-- Both rows are append-only — see 0011 for the immutability trigger.
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    description TEXT NOT NULL CHECK (length(trim(description)) > 0),
    occurred_at TIMESTAMPTZ NOT NULL,

    -- Optional inbound reference: NF-e number, bank statement line id, etc.
    external_ref VARCHAR(255),

    -- Who recorded it (audit). Nullable for system-generated rows (jobs).
    created_by UUID REFERENCES users(id),

    -- Reversal pointer. NULL for original transactions, set on reversals.
    reverses_transaction_id UUID REFERENCES transactions(id) ON DELETE RESTRICT,

    metadata JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_workspace ON transactions(workspace_id);
CREATE INDEX idx_transactions_org ON transactions(organization_id);
CREATE INDEX idx_transactions_occurred ON transactions(workspace_id, occurred_at DESC);
CREATE INDEX idx_transactions_external_ref ON transactions(workspace_id, external_ref)
    WHERE external_ref IS NOT NULL;
CREATE INDEX idx_transactions_reverses ON transactions(reverses_transaction_id)
    WHERE reverses_transaction_id IS NOT NULL;
