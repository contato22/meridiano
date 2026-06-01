-- Defense in depth: even if the application layer is bypassed, the DB itself
-- refuses to commit a transaction whose entries don't balance per currency.
-- Implemented as a CONSTRAINT TRIGGER so it fires at the end of the SQL
-- transaction (after all entries are inserted), not after each row.

CREATE OR REPLACE FUNCTION enforce_double_entry_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    tx_id UUID := COALESCE(NEW.transaction_id, OLD.transaction_id);
    bad_currency CHAR(3);
    debit_total BIGINT;
    credit_total BIGINT;
BEGIN
    -- Find any currency in this transaction where debits != credits.
    SELECT currency,
           SUM(CASE WHEN side = 'debit' THEN amount_minor ELSE 0 END)::BIGINT,
           SUM(CASE WHEN side = 'credit' THEN amount_minor ELSE 0 END)::BIGINT
      INTO bad_currency, debit_total, credit_total
      FROM entries
     WHERE transaction_id = tx_id
     GROUP BY currency
     HAVING SUM(CASE WHEN side = 'debit' THEN amount_minor ELSE 0 END)
         != SUM(CASE WHEN side = 'credit' THEN amount_minor ELSE 0 END)
     LIMIT 1;

    IF bad_currency IS NOT NULL THEN
        RAISE EXCEPTION
            'transaction % is unbalanced in %: debits=% credits=%',
            tx_id, bad_currency, debit_total, credit_total;
    END IF;

    -- Also require at least one debit and one credit (degenerate single-side
    -- transactions are nonsensical for double-entry).
    IF NOT EXISTS (SELECT 1 FROM entries WHERE transaction_id = tx_id AND side = 'debit') THEN
        RAISE EXCEPTION 'transaction % has no debit entries', tx_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM entries WHERE transaction_id = tx_id AND side = 'credit') THEN
        RAISE EXCEPTION 'transaction % has no credit entries', tx_id;
    END IF;

    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER entries_double_entry_balance
    AFTER INSERT OR UPDATE OR DELETE ON entries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION enforce_double_entry_balance();
