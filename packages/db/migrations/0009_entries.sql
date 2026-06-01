-- Individual debit/credit leg of a transaction.
-- amount_minor is the bigint of minor currency units (cents for BRL/USD/EUR;
-- whole units for JPY). The application layer enforces positive amounts and
-- per-currency balance — additional defense-in-depth lives in the trigger
-- defined in 0010.
CREATE TABLE entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,

    side VARCHAR(6) NOT NULL CHECK (side IN ('debit', 'credit')),

    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency CHAR(3) NOT NULL,

    memo TEXT,

    -- Sequence within the transaction; preserves user-entered ordering.
    ordinal INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (transaction_id, ordinal)
);

CREATE INDEX idx_entries_transaction ON entries(transaction_id);
CREATE INDEX idx_entries_account ON entries(account_id);
CREATE INDEX idx_entries_account_created ON entries(account_id, created_at DESC);

-- Account-vs-amount currency match is enforced via this trigger so the DB
-- itself refuses an entry whose amount currency disagrees with the account.
CREATE OR REPLACE FUNCTION enforce_entry_account_currency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    acc_currency CHAR(3);
    acc_archived TIMESTAMPTZ;
BEGIN
    SELECT currency, archived_at INTO acc_currency, acc_archived
    FROM accounts WHERE id = NEW.account_id;

    IF acc_currency IS NULL THEN
        RAISE EXCEPTION 'entry references unknown account %', NEW.account_id;
    END IF;

    IF acc_currency != NEW.currency THEN
        RAISE EXCEPTION 'entry currency % does not match account currency % (account %)',
            NEW.currency, acc_currency, NEW.account_id;
    END IF;

    IF acc_archived IS NOT NULL THEN
        RAISE EXCEPTION 'account % is archived and cannot accept new entries', NEW.account_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER entries_currency_check
    BEFORE INSERT ON entries
    FOR EACH ROW EXECUTE FUNCTION enforce_entry_account_currency();
