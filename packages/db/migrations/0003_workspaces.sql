CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'PF',
        'HOLDING',
        'PORTFOLIO',
        'REAL_ESTATE',
        'CUSTOM'
    )),

    base_currency CHAR(3) NOT NULL DEFAULT 'BRL',

    metadata JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (organization_id, slug)
);

CREATE INDEX idx_workspaces_org ON workspaces(organization_id);

CREATE TRIGGER workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
