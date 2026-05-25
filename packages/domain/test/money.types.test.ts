import { describe, expectTypeOf, it } from 'vitest';
import { Money } from '../src/money/index.js';

/**
 * Type-level tests for branded Money<C>. These never execute at runtime — they
 * verify that the compiler refuses cross-currency operations and that generic
 * inference produces the narrowed currency type.
 */

describe('Money<C> — compile-time currency safety', () => {
  it('fromMinor narrows the currency parameter', () => {
    const brl = Money.fromMinor(100, 'BRL');
    const usd = Money.fromMinor(100, 'USD');
    expectTypeOf(brl).toEqualTypeOf<Money<'BRL'>>();
    expectTypeOf(usd).toEqualTypeOf<Money<'USD'>>();
  });

  it('zero narrows the currency parameter', () => {
    expectTypeOf(Money.zero('JPY')).toEqualTypeOf<Money<'JPY'>>();
  });

  it('parseUnsafe narrows the currency parameter', () => {
    expectTypeOf(Money.parseUnsafe('100.00', 'EUR')).toEqualTypeOf<Money<'EUR'>>();
  });

  it('add rejects different currencies at compile time', () => {
    // Never executed — these calls would throw CurrencyMismatchError at runtime,
    // but the @ts-expect-error markers verify the compiler catches it first.
    function _unreached(): void {
      const brl = Money.fromMinor(100, 'BRL');
      const usd = Money.fromMinor(100, 'USD');

      // @ts-expect-error — cannot add Money<'USD'> to Money<'BRL'>
      brl.add(usd);

      // @ts-expect-error — cannot subtract Money<'USD'> from Money<'BRL'>
      brl.subtract(usd);

      // @ts-expect-error — cannot compare Money<'USD'> to Money<'BRL'>
      brl.compare(usd);

      // @ts-expect-error — cannot equals Money<'USD'> to Money<'BRL'>
      brl.equals(usd);
    }
    expectTypeOf(_unreached).toEqualTypeOf<() => void>();
  });

  it('arithmetic returns same-currency Money', () => {
    const brl = Money.fromMinor(100, 'BRL');
    expectTypeOf(brl.add(brl)).toEqualTypeOf<Money<'BRL'>>();
    expectTypeOf(brl.multiply(2)).toEqualTypeOf<Money<'BRL'>>();
    expectTypeOf(brl.negate()).toEqualTypeOf<Money<'BRL'>>();
    expectTypeOf(brl.abs()).toEqualTypeOf<Money<'BRL'>>();
    expectTypeOf(brl.divide(2)).toEqualTypeOf<Money<'BRL'>>();
    expectTypeOf(brl.allocate(2)).toEqualTypeOf<Money<'BRL'>[]>();
  });

  it('equalsAny accepts cross-currency at compile time', () => {
    const brl = Money.fromMinor(100, 'BRL');
    const usd = Money.fromMinor(100, 'USD');
    // Allowed: equalsAny is the escape hatch for runtime currency comparison.
    brl.equalsAny(usd);
  });

  it('toJSON preserves the currency literal', () => {
    const brl = Money.fromMinor(100, 'BRL');
    expectTypeOf(brl.toJSON()).toEqualTypeOf<{ minor: string; currency: 'BRL' }>();
  });
});
