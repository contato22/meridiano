-- Materialized running balance per (account, currency). Maintained by trigger
-- on entries INSERT. Reads are O(1) instead of O(N) over entries.
--
-- The balance is signed: +amount for asset/expense debits and liability/equity/
-- revenue credits, -amount for the opposite side. This matches accounting
-- convention: an asset balance grows on debit, a liability balance grows on
-- credit.

CREATE TABLE account_balances (
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    currency CHAR(3) NOT NULL,

    -- Signed minor units. Positive = "natural side" balance for the account type.
    balance_minor BIGINT NOT NULL DEFAULT 0,

    last_entry_at TIMESTAMPTZ,
    entry_count INTEGER NOT NULL DEFAULT 0,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (account_id, currency)
);

CREATE INDEX idx_account_balances_currency ON account_balances(currency);


CREATE OR REPLACE FUNCTION apply_entry_to_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    acc_type VARCHAR(20);
    delta BIGINT;
    natural_debit BOOLEAN;
BEGIN
    SELECT type INTO acc_type FROM accounts WHERE id = NEW.account_id;

    -- Assets and expenses naturally grow on the debit side; liabilities, equity,
    -- and revenue grow on the credit side.
    natural_debit := acc_type IN ('asset', 'expense');

    IF NEW.side = 'debit' THEN
        delta := CASE WHEN natural_debit THEN NEW.amount_minor ELSE -NEW.amount_minor END;
    ELSE
        delta := CASE WHEN natural_debit THEN -NEW.amount_minor ELSE NEW.amount_minor END;
    END IF;

    INSERT INTO account_balances (account_id, currency, balance_minor, last_entry_at, entry_count)
    VALUES (NEW.account_id, NEW.currency, delta, NEW.created_at, 1)
    ON CONFLICT (account_id, currency) DO UPDATE
       SET balance_minor = account_balances.balance_minor + EXCLUDED.balance_minor,
           last_entry_at = EXCLUDED.last_entry_at,
           entry_count   = account_balances.entry_count + 1,
           updated_at    = NOW();

    RETURN NEW;
END;
$$;

CREATE TRIGGER entries_apply_to_balance
    AFTER INSERT ON entries
    FOR EACH ROW EXECUTE FUNCTION apply_entry_to_balance();
