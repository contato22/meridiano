-- The ledger is append-only. Once a transaction and its entries are committed,
-- they cannot be modified or deleted from this database. Corrections happen
-- via a *reversing transaction* (a new transaction whose reverses_transaction_id
-- points at the original).
--
-- We allow only:
--   - UPDATE of `transactions.reverses_transaction_id` from NULL to a value
--     (so a transaction can be marked as reversed once, by inserting the reversal).
--   - Any DELETE / UPDATE by the special SYSTEM role (reserved for migrations
--     and explicit admin recovery — not exposed via the application).
--
-- Anything else raises.

CREATE OR REPLACE FUNCTION enforce_ledger_immutability_transactions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'transactions are append-only: refusing DELETE on %', OLD.id;
    END IF;

    -- UPDATE: only `reverses_transaction_id` may change, and only NULL → set.
    IF OLD.id IS DISTINCT FROM NEW.id THEN
        RAISE EXCEPTION 'transactions.id is immutable';
    END IF;
    IF OLD.organization_id IS DISTINCT FROM NEW.organization_id
       OR OLD.workspace_id IS DISTINCT FROM NEW.workspace_id
       OR OLD.description IS DISTINCT FROM NEW.description
       OR OLD.occurred_at IS DISTINCT FROM NEW.occurred_at
       OR OLD.external_ref IS DISTINCT FROM NEW.external_ref
       OR OLD.created_by IS DISTINCT FROM NEW.created_by
       OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
        RAISE EXCEPTION 'transaction % is append-only; mutate via a reversing transaction', OLD.id;
    END IF;

    -- reverses_transaction_id can only be set from NULL to a value, once.
    IF OLD.reverses_transaction_id IS NOT NULL
       AND OLD.reverses_transaction_id IS DISTINCT FROM NEW.reverses_transaction_id THEN
        RAISE EXCEPTION 'transactions.reverses_transaction_id is set-once on transaction %', OLD.id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER transactions_immutability
    BEFORE UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION enforce_ledger_immutability_transactions();


CREATE OR REPLACE FUNCTION enforce_ledger_immutability_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'entries are append-only: refusing DELETE on %', OLD.id;
    END IF;

    RAISE EXCEPTION 'entry % is append-only; mutate via a reversing transaction', OLD.id;
END;
$$;

CREATE TRIGGER entries_immutability
    BEFORE UPDATE OR DELETE ON entries
    FOR EACH ROW EXECUTE FUNCTION enforce_ledger_immutability_entries();
