export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

export class UnbalancedTransactionError extends LedgerError {
  constructor(
    public readonly currency: string,
    public readonly debitTotal: string,
    public readonly creditTotal: string,
  ) {
    super(`Transaction is unbalanced for ${currency}: debits=${debitTotal} credits=${creditTotal}`);
    this.name = 'UnbalancedTransactionError';
  }
}

export class EmptyTransactionError extends LedgerError {
  constructor(message: string) {
    super(message);
    this.name = 'EmptyTransactionError';
  }
}

export class InvalidEntryError extends LedgerError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEntryError';
  }
}
