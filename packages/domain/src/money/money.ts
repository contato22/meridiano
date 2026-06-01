import type { Result } from '../result.js';
import { err, ok } from '../result.js';
import type { CurrencyCode } from './currency.js';
import { CURRENCIES, isCurrencyCode } from './currency.js';
import { CurrencyMismatchError, DivisionByZeroError, InvalidAmountError } from './errors.js';
import type { MoneyError } from './errors.js';

export type Rounding = 'half-even' | 'half-up' | 'down' | 'up';

/**
 * Money is a branded value object parameterized by currency code. `Money<'BRL'>`
 * and `Money<'USD'>` are distinct types; the TS compiler refuses to add them.
 * Internally still stored as a bigint of minor units (e.g. BRL "cents") to avoid
 * IEEE-754 precision loss. A runtime check defends against casts (and any code
 * that drops the generic via `Money` without parameter).
 */
export class Money<C extends CurrencyCode = CurrencyCode> {
  private constructor(
    public readonly minor: bigint,
    public readonly currency: C,
  ) {
    Object.freeze(this);
  }

  static fromMinor<C extends CurrencyCode>(minor: bigint | number, currency: C): Money<C> {
    if (typeof minor === 'number' && !Number.isInteger(minor)) {
      throw new InvalidAmountError(`Minor units must be integer: got ${minor}`);
    }
    const asBig = typeof minor === 'bigint' ? minor : BigInt(minor);
    return new Money(asBig, currency);
  }

  static zero<C extends CurrencyCode>(currency: C): Money<C> {
    return new Money(0n, currency);
  }

  /**
   * Build Money from a decimal string ("12.34" or "12") with the currency's natural precision.
   * Rejects scientific notation, locale separators, and any precision beyond what the currency
   * supports — by design, since silent truncation of cents is a bug magnet.
   */
  static parse<C extends CurrencyCode>(amount: string, currency: C): Result<Money<C>, MoneyError> {
    const trimmed = amount.trim();
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return err(new InvalidAmountError(`Invalid amount format: "${amount}"`));
    }
    const spec = CURRENCIES[currency];
    const negative = trimmed.startsWith('-');
    const unsigned = negative ? trimmed.slice(1) : trimmed;
    const [intPart, fracPart = ''] = unsigned.split('.') as [string, string?];

    if (fracPart.length > spec.decimals) {
      return err(
        new InvalidAmountError(
          `Currency ${currency} supports at most ${String(spec.decimals)} decimals, got "${amount}"`,
        ),
      );
    }
    const padded = fracPart.padEnd(spec.decimals, '0');
    const combined = `${intPart}${padded}`;
    const minor = BigInt(combined) * (negative ? -1n : 1n);
    return ok(new Money(minor, currency));
  }

  static parseUnsafe<C extends CurrencyCode>(amount: string, currency: C): Money<C> {
    const r = Money.parse(amount, currency);
    if (!r.ok) throw r.error;
    return r.value;
  }

  add(other: Money<C>): Money<C> {
    this.assertSameCurrency(other);
    return new Money(this.minor + other.minor, this.currency);
  }

  subtract(other: Money<C>): Money<C> {
    this.assertSameCurrency(other);
    return new Money(this.minor - other.minor, this.currency);
  }

  negate(): Money<C> {
    return new Money(-this.minor, this.currency);
  }

  abs(): Money<C> {
    return new Money(this.minor < 0n ? -this.minor : this.minor, this.currency);
  }

  /**
   * Multiply by an integer factor. Stays exact.
   * For decimal multipliers (e.g. tax rates), use `multiplyDecimal` which requires explicit rounding.
   */
  multiply(factor: bigint | number): Money<C> {
    if (typeof factor === 'number' && !Number.isInteger(factor)) {
      throw new InvalidAmountError(
        `multiply() requires integer factor, got ${factor}. Use multiplyDecimal().`,
      );
    }
    const f = typeof factor === 'bigint' ? factor : BigInt(factor);
    return new Money(this.minor * f, this.currency);
  }

  /**
   * Multiply by a decimal factor expressed as a string ("0.085" for 8.5%). Rounding is mandatory.
   */
  multiplyDecimal(factor: string, rounding: Rounding = 'half-even'): Money<C> {
    if (!/^-?\d+(\.\d+)?$/.test(factor.trim())) {
      throw new InvalidAmountError(`Invalid decimal factor: "${factor}"`);
    }
    const negative = factor.trim().startsWith('-');
    const unsigned = negative ? factor.trim().slice(1) : factor.trim();
    const [intPart, fracPart = ''] = unsigned.split('.') as [string, string?];
    const scale = BigInt(fracPart.length);
    const factorMinor = BigInt(`${intPart}${fracPart}`) * (negative ? -1n : 1n);
    const denom = 10n ** scale;
    const product = this.minor * factorMinor;
    return new Money(divideRounded(product, denom, rounding), this.currency);
  }

  /**
   * Integer division by a non-zero integer divisor; returns the floor-rounded result.
   * For currency-aware splitting (no lost cents), use `allocate`.
   */
  divide(divisor: bigint | number, rounding: Rounding = 'half-even'): Money<C> {
    if (typeof divisor === 'number' && !Number.isInteger(divisor)) {
      throw new InvalidAmountError(`divide() requires integer divisor, got ${divisor}`);
    }
    const d = typeof divisor === 'bigint' ? divisor : BigInt(divisor);
    if (d === 0n) throw new DivisionByZeroError();
    return new Money(divideRounded(this.minor, d, rounding), this.currency);
  }

  /**
   * Allocate this amount across N equal parts without losing or inventing cents.
   * Remainder cents are distributed one-by-one to the first parts.
   */
  allocate(parts: number): Money<C>[] {
    if (!Number.isInteger(parts) || parts <= 0) {
      throw new InvalidAmountError(`allocate() requires positive integer parts, got ${parts}`);
    }
    const n = BigInt(parts);
    const base = this.minor / n;
    const remainder = this.minor - base * n;
    const sign = this.minor < 0n ? -1n : 1n;
    const absRem = remainder < 0n ? -remainder : remainder;
    const result: Money<C>[] = [];
    for (let i = 0n; i < n; i++) {
      const extra = i < absRem ? sign : 0n;
      result.push(new Money(base + extra, this.currency));
    }
    return result;
  }

  /**
   * Allocate by integer ratios (e.g. [1, 2, 1] → 25%/50%/25%). Same "no lost cents" guarantee.
   */
  allocateByRatios(ratios: readonly number[]): Money<C>[] {
    if (ratios.length === 0) {
      throw new InvalidAmountError('allocateByRatios() requires at least one ratio');
    }
    for (const r of ratios) {
      if (!Number.isInteger(r) || r < 0) {
        throw new InvalidAmountError(`Ratios must be non-negative integers, got ${r}`);
      }
    }
    const total = ratios.reduce((s, r) => s + BigInt(r), 0n);
    if (total === 0n) {
      throw new InvalidAmountError('Sum of ratios must be greater than zero');
    }
    const shares = ratios.map((r) => (this.minor * BigInt(r)) / total);
    const distributed = shares.reduce((s, x) => s + x, 0n);
    const remainder = this.minor - distributed;
    const sign = remainder < 0n ? -1n : 1n;
    let absRem = remainder < 0n ? -remainder : remainder;
    const result = shares.slice();
    for (let i = 0; absRem > 0n && i < result.length; i++) {
      result[i] = (result[i] ?? 0n) + sign;
      absRem -= 1n;
    }
    return result.map((m) => new Money(m, this.currency));
  }

  equals(other: Money<C>): boolean {
    return this.currency === other.currency && this.minor === other.minor;
  }

  /**
   * Cross-currency equality check. Returns false if currencies differ — useful for
   * comparing two values that may or may not share a currency. Use `equals` when
   * the compile-time currency parameter is already known to match.
   */
  equalsAny(other: Money): boolean {
    return this.currency === other.currency && this.minor === other.minor;
  }

  compare(other: Money<C>): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    if (this.minor < other.minor) return -1;
    if (this.minor > other.minor) return 1;
    return 0;
  }

  lessThan(other: Money<C>): boolean {
    return this.compare(other) < 0;
  }

  lessThanOrEqual(other: Money<C>): boolean {
    return this.compare(other) <= 0;
  }

  greaterThan(other: Money<C>): boolean {
    return this.compare(other) > 0;
  }

  greaterThanOrEqual(other: Money<C>): boolean {
    return this.compare(other) >= 0;
  }

  isZero(): boolean {
    return this.minor === 0n;
  }

  isPositive(): boolean {
    return this.minor > 0n;
  }

  isNegative(): boolean {
    return this.minor < 0n;
  }

  /**
   * Decimal string representation ("12.34"), language-agnostic. Use `format` for locale output.
   */
  toString(): string {
    const spec = CURRENCIES[this.currency];
    const negative = this.minor < 0n;
    const abs = negative ? -this.minor : this.minor;
    const str = abs.toString().padStart(spec.decimals + 1, '0');
    if (spec.decimals === 0) {
      return `${negative ? '-' : ''}${str}`;
    }
    const intPart = str.slice(0, str.length - spec.decimals);
    const fracPart = str.slice(str.length - spec.decimals);
    return `${negative ? '-' : ''}${intPart}.${fracPart}`;
  }

  format(locale = 'pt-BR'): string {
    const spec = CURRENCIES[this.currency];
    const asNumber = Number(this.minor) / 10 ** spec.decimals;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: spec.decimals,
      maximumFractionDigits: spec.decimals,
    }).format(asNumber);
  }

  toJSON(): { minor: string; currency: C } {
    return { minor: this.minor.toString(), currency: this.currency };
  }

  static fromJSON(value: unknown): Result<Money, MoneyError> {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('minor' in value) ||
      !('currency' in value)
    ) {
      return err(new InvalidAmountError('Invalid Money JSON shape'));
    }
    const { minor, currency } = value;
    if (typeof currency !== 'string' || !isCurrencyCode(currency)) {
      return err(new InvalidAmountError(`Unknown currency: ${String(currency)}`));
    }
    if (typeof minor !== 'string' || !/^-?\d+$/.test(minor)) {
      return err(new InvalidAmountError(`Invalid minor field: ${String(minor)}`));
    }
    return ok(new Money(BigInt(minor), currency));
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }
}

function divideRounded(numerator: bigint, denominator: bigint, mode: Rounding): bigint {
  if (denominator === 0n) throw new DivisionByZeroError();
  const negative = numerator < 0n !== denominator < 0n;
  const absN = numerator < 0n ? -numerator : numerator;
  const absD = denominator < 0n ? -denominator : denominator;
  const quotient = absN / absD;
  const remainder = absN - quotient * absD;
  if (remainder === 0n) return negative ? -quotient : quotient;

  const doubled = remainder * 2n;
  let rounded = quotient;
  switch (mode) {
    case 'down':
      break;
    case 'up':
      rounded += 1n;
      break;
    case 'half-up':
      if (doubled >= absD) rounded += 1n;
      break;
    case 'half-even': {
      if (doubled > absD) rounded += 1n;
      else if (doubled === absD && quotient % 2n !== 0n) rounded += 1n;
      break;
    }
  }
  return negative ? -rounded : rounded;
}
