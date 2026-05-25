import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  CurrencyMismatchError,
  DivisionByZeroError,
  InvalidAmountError,
  Money,
} from '../src/money/index.js';

const MAX_MINOR = 10n ** 15n;
const moneyBRL = (): fc.Arbitrary<Money<'BRL'>> =>
  fc.bigInt({ min: -MAX_MINOR, max: MAX_MINOR }).map((m) => Money.fromMinor(m, 'BRL'));

describe('Money — construction', () => {
  it('rejects non-integer minor units', () => {
    expect(() => Money.fromMinor(1.5, 'BRL')).toThrow(InvalidAmountError);
  });

  it('parses well-formed decimal strings', () => {
    const r = Money.parse('12.34', 'BRL');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.minor).toBe(1234n);
  });

  it('parses integer strings as currency precision allows', () => {
    const r = Money.parse('100', 'BRL');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.minor).toBe(10000n);
  });

  it('rejects strings with excess decimals', () => {
    const r = Money.parse('12.345', 'BRL');
    expect(r.ok).toBe(false);
  });

  it('rejects scientific notation and locale separators', () => {
    expect(Money.parse('1e2', 'BRL').ok).toBe(false);
    expect(Money.parse('1.234,56', 'BRL').ok).toBe(false);
    expect(Money.parse(' 12.34 ', 'BRL').ok).toBe(true); // trim allowed
    expect(Money.parse('R$ 12.34', 'BRL').ok).toBe(false);
  });

  it('handles negative amounts', () => {
    const r = Money.parse('-0.05', 'BRL');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.minor).toBe(-5n);
  });

  it('parseUnsafe throws on invalid input', () => {
    expect(() => Money.parseUnsafe('abc', 'BRL')).toThrow();
  });
});

describe('Money — arithmetic laws (property-based)', () => {
  it('addition is commutative', () => {
    fc.assert(
      fc.property(moneyBRL(), moneyBRL(), (a, b) => {
        expect(a.add(b).equals(b.add(a))).toBe(true);
      }),
    );
  });

  it('addition is associative', () => {
    fc.assert(
      fc.property(moneyBRL(), moneyBRL(), moneyBRL(), (a, b, c) => {
        expect(
          a
            .add(b)
            .add(c)
            .equals(a.add(b.add(c))),
        ).toBe(true);
      }),
    );
  });

  it('zero is the additive identity', () => {
    fc.assert(
      fc.property(moneyBRL(), (a) => {
        expect(a.add(Money.zero('BRL')).equals(a)).toBe(true);
      }),
    );
  });

  it('subtraction undoes addition', () => {
    fc.assert(
      fc.property(moneyBRL(), moneyBRL(), (a, b) => {
        expect(a.add(b).subtract(b).equals(a)).toBe(true);
      }),
    );
  });

  it('negation is involutive', () => {
    fc.assert(
      fc.property(moneyBRL(), (a) => {
        expect(a.negate().negate().equals(a)).toBe(true);
      }),
    );
  });

  it('abs is idempotent and non-negative', () => {
    fc.assert(
      fc.property(moneyBRL(), (a) => {
        const once = a.abs();
        expect(once.abs().equals(once)).toBe(true);
        expect(once.isNegative()).toBe(false);
      }),
    );
  });

  it('multiply by 1 is identity, by 0 yields zero', () => {
    fc.assert(
      fc.property(moneyBRL(), (a) => {
        expect(a.multiply(1).equals(a)).toBe(true);
        expect(a.multiply(0).isZero()).toBe(true);
      }),
    );
  });

  it('multiply is distributive over addition', () => {
    fc.assert(
      fc.property(moneyBRL(), moneyBRL(), fc.integer({ min: -100, max: 100 }), (a, b, k) => {
        const lhs = a.add(b).multiply(k);
        const rhs = a.multiply(k).add(b.multiply(k));
        expect(lhs.equals(rhs)).toBe(true);
      }),
    );
  });
});

describe('Money — runtime currency safety (defense in depth)', () => {
  // Branded Money<C> blocks cross-currency at compile time; these tests verify
  // the runtime guard still fires for code that defeats the type system via
  // casts (e.g. data deserialized as `Money<CurrencyCode>` then forced).
  it('rejects cross-currency arithmetic', () => {
    const brl = Money.fromMinor(100, 'BRL');
    const usd = Money.fromMinor(100, 'USD') as unknown as Money<'BRL'>;
    expect(() => brl.add(usd)).toThrow(CurrencyMismatchError);
    expect(() => brl.subtract(usd)).toThrow(CurrencyMismatchError);
    expect(() => brl.compare(usd)).toThrow(CurrencyMismatchError);
  });

  it('equalsAny across currencies is always false', () => {
    const brl = Money.fromMinor(100, 'BRL');
    const usd = Money.fromMinor(100, 'USD');
    expect(brl.equalsAny(usd)).toBe(false);
  });
});

describe('Money — allocate (no lost cents)', () => {
  it('allocate sum equals original (property-based)', () => {
    fc.assert(
      fc.property(moneyBRL(), fc.integer({ min: 1, max: 100 }), (a, parts) => {
        const slices = a.allocate(parts);
        const sum = slices.reduce((acc, s) => acc.add(s), Money.zero('BRL'));
        expect(sum.equals(a)).toBe(true);
        expect(slices).toHaveLength(parts);
      }),
    );
  });

  it('allocate distributes remainder to first slices', () => {
    const ten = Money.fromMinor(10, 'BRL');
    const [a, b, c] = ten.allocate(3);
    expect(a?.minor).toBe(4n);
    expect(b?.minor).toBe(3n);
    expect(c?.minor).toBe(3n);
  });

  it('allocate handles negative amounts', () => {
    const neg = Money.fromMinor(-10, 'BRL');
    const slices = neg.allocate(3);
    const sum = slices.reduce((acc, s) => acc.add(s), Money.zero('BRL'));
    expect(sum.equals(neg)).toBe(true);
  });

  it('allocate rejects invalid parts', () => {
    const m = Money.fromMinor(100, 'BRL');
    expect(() => m.allocate(0)).toThrow(InvalidAmountError);
    expect(() => m.allocate(-1)).toThrow(InvalidAmountError);
    expect(() => m.allocate(1.5)).toThrow(InvalidAmountError);
  });

  it('allocateByRatios preserves total', () => {
    fc.assert(
      fc.property(
        moneyBRL(),
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 10 }),
        (a, ratios) => {
          if (ratios.every((r) => r === 0)) return; // skip degenerate case
          const slices = a.allocateByRatios(ratios);
          const sum = slices.reduce((acc, s) => acc.add(s), Money.zero('BRL'));
          expect(sum.equals(a)).toBe(true);
          expect(slices).toHaveLength(ratios.length);
        },
      ),
    );
  });

  it('allocateByRatios rejects all-zero ratios', () => {
    const m = Money.fromMinor(100, 'BRL');
    expect(() => m.allocateByRatios([0, 0, 0])).toThrow(InvalidAmountError);
    expect(() => m.allocateByRatios([])).toThrow(InvalidAmountError);
    expect(() => m.allocateByRatios([1, -1])).toThrow(InvalidAmountError);
  });
});

describe('Money — division and decimal multiplication', () => {
  it('divide by zero throws', () => {
    expect(() => Money.fromMinor(100, 'BRL').divide(0)).toThrow(DivisionByZeroError);
  });

  it('divide rejects non-integer divisor', () => {
    expect(() => Money.fromMinor(100, 'BRL').divide(1.5)).toThrow(InvalidAmountError);
  });

  it('half-even rounding (banker rounding) — 0.5 rounds to even', () => {
    // 5 / 2 = 2.5 → 2 (even); 15 / 2 = 7.5 → 8 (even); -5 / 2 = -2.5 → -2
    expect(Money.fromMinor(5, 'BRL').divide(2).minor).toBe(2n);
    expect(Money.fromMinor(15, 'BRL').divide(2).minor).toBe(8n);
    expect(Money.fromMinor(-5, 'BRL').divide(2).minor).toBe(-2n);
  });

  it('half-up rounds 0.5 away from zero', () => {
    expect(Money.fromMinor(5, 'BRL').divide(2, 'half-up').minor).toBe(3n);
    expect(Money.fromMinor(-5, 'BRL').divide(2, 'half-up').minor).toBe(-3n);
  });

  it('multiplyDecimal computes tax-rate-style products', () => {
    const r$100 = Money.parseUnsafe('100.00', 'BRL');
    const withTax = r$100.multiplyDecimal('0.085'); // 8.5% → 8.50
    expect(withTax.toString()).toBe('8.50');
  });

  it('multiplyDecimal rejects invalid factors', () => {
    expect(() => Money.fromMinor(100, 'BRL').multiplyDecimal('abc')).toThrow(InvalidAmountError);
  });
});

describe('Money — serialization round-trip', () => {
  it('toJSON / fromJSON is a round-trip (property-based)', () => {
    fc.assert(
      fc.property(moneyBRL(), (a) => {
        const json = JSON.parse(JSON.stringify(a)) as unknown;
        const r = Money.fromJSON(json);
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.value.equals(a)).toBe(true);
      }),
    );
  });

  it('toString / parse is a round-trip (property-based)', () => {
    fc.assert(
      fc.property(moneyBRL(), (a) => {
        const r = Money.parse(a.toString(), 'BRL');
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.value.equals(a)).toBe(true);
      }),
    );
  });

  it('fromJSON rejects malformed payloads', () => {
    expect(Money.fromJSON(null).ok).toBe(false);
    expect(Money.fromJSON({ minor: '12', currency: 'XYZ' }).ok).toBe(false);
    expect(Money.fromJSON({ minor: 'abc', currency: 'BRL' }).ok).toBe(false);
    expect(Money.fromJSON({ minor: '12' }).ok).toBe(false);
  });
});

describe('Money — formatting', () => {
  it('formats BRL with locale', () => {
    const m = Money.parseUnsafe('1234.56', 'BRL');
    const formatted = m.format('pt-BR');
    expect(formatted).toMatch(/R\$/);
    expect(formatted).toMatch(/1\.234,56/);
  });

  it('toString preserves zero-padded fractional part', () => {
    expect(Money.fromMinor(5, 'BRL').toString()).toBe('0.05');
    expect(Money.fromMinor(-5, 'BRL').toString()).toBe('-0.05');
  });
});

describe('Money — zero-decimal currencies (JPY)', () => {
  it('parses and renders integer-only amounts', () => {
    const r = Money.parse('1500', 'JPY');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.minor).toBe(1500n);
      expect(r.value.toString()).toBe('1500');
    }
  });

  it('rejects fractional amounts for zero-decimal currencies', () => {
    expect(Money.parse('1500.5', 'JPY').ok).toBe(false);
  });

  it('formats negative integer-only amount', () => {
    expect(Money.fromMinor(-200, 'JPY').toString()).toBe('-200');
  });
});

describe('Money — rounding modes', () => {
  it('rounds down (toward zero)', () => {
    expect(Money.fromMinor(7, 'BRL').divide(2, 'down').minor).toBe(3n);
    expect(Money.fromMinor(-7, 'BRL').divide(2, 'down').minor).toBe(-3n);
  });

  it('rounds up (away from zero)', () => {
    expect(Money.fromMinor(7, 'BRL').divide(2, 'up').minor).toBe(4n);
    expect(Money.fromMinor(-7, 'BRL').divide(2, 'up').minor).toBe(-4n);
  });

  it('half-up with values above halfway', () => {
    expect(Money.fromMinor(7, 'BRL').divide(2, 'half-up').minor).toBe(4n);
  });
});

describe('Money — comparisons', () => {
  it('compare is consistent with arithmetic', () => {
    fc.assert(
      fc.property(moneyBRL(), moneyBRL(), (a, b) => {
        const diff = a.subtract(b);
        if (diff.isZero()) expect(a.compare(b)).toBe(0);
        else if (diff.isNegative()) expect(a.compare(b)).toBe(-1);
        else expect(a.compare(b)).toBe(1);
      }),
    );
  });

  it('lessThan / greaterThan helpers', () => {
    const a = Money.fromMinor(100, 'BRL');
    const b = Money.fromMinor(200, 'BRL');
    expect(a.lessThan(b)).toBe(true);
    expect(b.greaterThan(a)).toBe(true);
    expect(a.lessThanOrEqual(a)).toBe(true);
    expect(a.greaterThanOrEqual(a)).toBe(true);
  });
});
