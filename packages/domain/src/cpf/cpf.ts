import type { Result } from '../result.js';
import { err, ok } from '../result.js';

export class InvalidCPFError extends Error {
  constructor(
    message: string,
    public readonly input: string,
  ) {
    super(message);
    this.name = 'InvalidCPFError';
  }
}

/**
 * CPF — Cadastro de Pessoas Físicas (Brazilian individual taxpayer ID).
 * 11 digits. Always stored stripped (digits only). Construction is total: invalid input → Result.err.
 */
export class CPF {
  private constructor(private readonly digits: string) {
    Object.freeze(this);
  }

  static parse(input: string): Result<CPF, InvalidCPFError> {
    if (typeof input !== 'string') {
      return err(new InvalidCPFError('CPF input must be a string', String(input)));
    }
    const digits = input.replace(/\D/g, '');
    if (digits.length !== 11) {
      return err(new InvalidCPFError(`CPF must have 11 digits, got ${digits.length}`, input));
    }
    if (/^(\d)\1{10}$/.test(digits)) {
      return err(new InvalidCPFError('CPF cannot be all the same digit', input));
    }
    const expected = computeCheckDigits(digits.slice(0, 9));
    if (digits.slice(9) !== expected) {
      return err(new InvalidCPFError('CPF check digits are invalid', input));
    }
    return ok(new CPF(digits));
  }

  static isValid(input: string): boolean {
    return CPF.parse(input).ok;
  }

  /**
   * Generate a syntactically valid CPF — for tests and fixtures only.
   * NEVER use a generated CPF to impersonate a real individual.
   */
  static generate(rng: () => number = Math.random): CPF {
    let base = '';
    let attempts = 0;
    while (attempts < 100) {
      base = '';
      for (let i = 0; i < 9; i++) {
        base += Math.floor(rng() * 10).toString();
      }
      if (!/^(\d)\1{8}$/.test(base)) break;
      attempts++;
    }
    const digits = base + computeCheckDigits(base);
    return new CPF(digits);
  }

  get value(): string {
    return this.digits;
  }

  format(): string {
    return `${this.digits.slice(0, 3)}.${this.digits.slice(3, 6)}.${this.digits.slice(6, 9)}-${this.digits.slice(9)}`;
  }

  equals(other: CPF): boolean {
    return this.digits === other.digits;
  }

  toString(): string {
    return this.format();
  }

  toJSON(): string {
    return this.digits;
  }
}

function computeCheckDigits(base9: string): string {
  const d1 = computeDigit(base9, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = computeDigit(base9 + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${d1}${d2}`;
}

function computeDigit(digits: string, weights: readonly number[]): string {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += Number(digits.charAt(i)) * (weights[i] ?? 0);
  }
  const mod = sum % 11;
  return mod < 2 ? '0' : String(11 - mod);
}
