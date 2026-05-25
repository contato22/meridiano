export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

export class CurrencyMismatchError extends MoneyError {
  constructor(
    public readonly left: string,
    public readonly right: string,
  ) {
    super(`Cannot operate on different currencies: ${left} vs ${right}`);
    this.name = 'CurrencyMismatchError';
  }
}

export class InvalidAmountError extends MoneyError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAmountError';
  }
}

export class DivisionByZeroError extends MoneyError {
  constructor() {
    super('Division by zero');
    this.name = 'DivisionByZeroError';
  }
}
