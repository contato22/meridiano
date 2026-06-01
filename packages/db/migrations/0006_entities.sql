CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,

    type VARCHAR(30) NOT NULL CHECK (type IN (
        'INDIVIDUAL',
        'LLC',
        'CORPORATION',
        'TRUST',
        'FOUNDATION',
        'PARTNERSHIP',
        'OFFSHORE'
    )),

    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),

    -- Brazilian docs are stored stripped (digits only), the domain layer
    -- enforces checksum validation via CPF/CNPJ value objects on the way in.
    cpf VARCHAR(11),
    cnpj VARCHAR(14),

    tax_id VARCHAR(50),
    jurisdiction CHAR(2) NOT NULL DEFAULT 'BR',

    address JSONB,

    is_active BOOLEAN NOT NULL DEFAULT true,

    metadata JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Every entity must carry at least one identifier we can dedupe by.
    CONSTRAINT entity_has_identifier CHECK (
        cpf IS NOT NULL OR cnpj IS NOT NULL OR tax_id IS NOT NULL
    ),

    -- BR document format: digits only at the storage layer.
    CONSTRAINT entity_cpf_format CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$'),
    CONSTRAINT entity_cnpj_format CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$')
);

CREATE INDEX idx_entities_org ON entities(organization_id);
CREATE INDEX idx_entities_workspace ON entities(workspace_id);
CREATE INDEX idx_entities_cnpj ON entities(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX idx_entities_cpf ON entities(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_entities_type ON entities(type);

CREATE TRIGGER entities_updated_at
    BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
