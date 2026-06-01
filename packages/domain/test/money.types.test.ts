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

  it('arithmetic methods require same currency at compile time', () => {
    // For each currency-sensitive method, the parameter type is locked to the
    // receiver's currency. Cross-currency arguments are rejected at compile time.
    type AddParam = Parameters<Money<'BRL'>['add']>[0];
    type SubParam = Parameters<Money<'BRL'>['subtract']>[0];
    type EqParam = Parameters<Money<'BRL'>['equals']>[0];
    type CmpParam = Parameters<Money<'BRL'>['compare']>[0];

    expectTypeOf<AddParam>().toEqualTypeOf<Money<'BRL'>>();
    expectTypeOf<SubParam>().toEqualTypeOf<Money<'BRL'>>();
    expectTypeOf<EqParam>().toEqualTypeOf<Money<'BRL'>>();
    expectTypeOf<CmpParam>().toEqualTypeOf<Money<'BRL'>>();

    // Money<'USD'> is NOT assignable to Money<'BRL'>, so it fails the parameter type.
    expectTypeOf<Money<'USD'>>().not.toEqualTypeOf<AddParam>();
    expectTypeOf<Money<'USD'>>().not.toEqualTypeOf<SubParam>();
    expectTypeOf<Money<'USD'>>().not.toEqualTypeOf<EqParam>();
    expectTypeOf<Money<'USD'>>().not.toEqualTypeOf<CmpParam>();
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
    // equalsAny is the escape hatch for runtime currency comparison —
    // its parameter is the unparameterized `Money` (default = CurrencyCode union),
    // so any concrete Money<C> is assignable.
    type EqualsAnyParam = Parameters<Money<'BRL'>['equalsAny']>[0];
    expectTypeOf<Money<'USD'>>().toMatchTypeOf<EqualsAnyParam>();
    expectTypeOf<Money<'EUR'>>().toMatchTypeOf<EqualsAnyParam>();
  });

  it('toJSON preserves the currency literal', () => {
    const brl = Money.fromMinor(100, 'BRL');
    expectTypeOf(brl.toJSON()).toEqualTypeOf<{ minor: string; currency: 'BRL' }>();
  });
});
