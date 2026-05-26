import type { Result } from '../result.js';
import { err, ok } from '../result.js';

export class InvalidCNPJError extends Error {
  constructor(
    message: string,
    public readonly input: string,
  ) {
    super(message);
    this.name = 'InvalidCNPJError';
  }
}

/**
 * CNPJ — Cadastro Nacional da Pessoa Jurídica (Brazilian company taxpayer ID).
 * 14 digits. Stored stripped. Construction total via Result.
 *
 * Note: only the numeric CNPJ format is accepted. The alphanumeric CNPJ
 * (Receita Federal Resolução 2024) is out of scope for Sprint 0 and tracked
 * separately — see ADR-0003.
 */
export class CNPJ {
  private constructor(private readonly digits: string) {
    Object.freeze(this);
  }

  static parse(input: string): Result<CNPJ, InvalidCNPJError> {
    if (typeof input !== 'string') {
      return err(new InvalidCNPJError('CNPJ input must be a string', String(input)));
    }
    const digits = input.replace(/\D/g, '');
    if (digits.length !== 14) {
      return err(new InvalidCNPJError(`CNPJ must have 14 digits, got ${digits.length}`, input));
    }
    if (/^(\d)\1{13}$/.test(digits)) {
      return err(new InvalidCNPJError('CNPJ cannot be all the same digit', input));
    }
    const expected = computeCheckDigits(digits.slice(0, 12));
    if (digits.slice(12) !== expected) {
      return err(new InvalidCNPJError('CNPJ check digits are invalid', input));
    }
    return ok(new CNPJ(digits));
  }

  static isValid(input: string): boolean {
    return CNPJ.parse(input).ok;
  }

  /**
   * Generate a syntactically valid CNPJ — for tests and fixtures only.
   */
  static generate(rng: () => number = Math.random): CNPJ {
    let base = '';
    while (true) {
      base = '';
      for (let i = 0; i < 12; i++) {
        base += Math.floor(rng() * 10).toString();
      }
      if (!/^(\d)\1{11}$/.test(base)) break;
    }
    const digits = base + computeCheckDigits(base);
    return new CNPJ(digits);
  }

  get value(): string {
    return this.digits;
  }

  format(): string {
    return `${this.digits.slice(0, 2)}.${this.digits.slice(2, 5)}.${this.digits.slice(5, 8)}/${this.digits.slice(8, 12)}-${this.digits.slice(12)}`;
  }

  equals(other: CNPJ): boolean {
    return this.digits === other.digits;
  }

  /** Returns the 8-digit company root, shared by all branches of the same legal entity. */
  get root(): string {
    return this.digits.slice(0, 8);
  }

  /** Returns the 4-digit branch (filial) number. "0001" denotes the matriz (headquarters). */
  get branch(): string {
    return this.digits.slice(8, 12);
  }

  isHeadquarters(): boolean {
    return this.branch === '0001';
  }

  toString(): string {
    return this.format();
  }

  toJSON(): string {
    return this.digits;
  }
}

const WEIGHTS_D1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const WEIGHTS_D2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

function computeCheckDigits(base12: string): string {
  const d1 = computeDigit(base12, WEIGHTS_D1);
  const d2 = computeDigit(base12 + d1, WEIGHTS_D2);
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
