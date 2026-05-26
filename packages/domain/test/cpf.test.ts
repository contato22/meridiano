import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { CPF, InvalidCPFError } from '../src/cpf/index.js';

const KNOWN_VALID = ['529.982.247-25', '11144477735', '390.533.447-05'];

const KNOWN_INVALID = [
  '000.000.000-00',
  '111.111.111-11',
  '999.999.999-99',
  '529.982.247-26', // wrong d2
  '529.982.247-15', // wrong d1
  '12345',
  '',
  '123.456.789-XX',
];

describe('CPF — known fixtures', () => {
  it.each(KNOWN_VALID)('accepts valid CPF %s', (input) => {
    const r = CPF.parse(input);
    expect(r.ok).toBe(true);
  });

  it.each(KNOWN_INVALID)('rejects invalid CPF %s', (input) => {
    const r = CPF.parse(input);
    expect(r.ok).toBe(false);
  });

  it('isValid mirrors parse.ok', () => {
    expect(CPF.isValid('529.982.247-25')).toBe(true);
    expect(CPF.isValid('000.000.000-00')).toBe(false);
  });
});

describe('CPF — formatting and equality', () => {
  it('strips non-digits and formats canonically', () => {
    const r = CPF.parse('529.982.247-25');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.value).toBe('52998224725');
      expect(r.value.format()).toBe('529.982.247-25');
      expect(r.value.toString()).toBe('529.982.247-25');
      expect(JSON.stringify(r.value)).toBe('"52998224725"');
    }
  });

  it('equals compares by digits', () => {
    const a = CPF.parse('529.982.247-25');
    const b = CPF.parse('52998224725');
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.value.equals(b.value)).toBe(true);
  });

  it('handles non-string inputs safely', () => {
    // @ts-expect-error testing runtime guard
    const r = CPF.parse(12345);
    expect(r.ok).toBe(false);
  });
});

describe('CPF — property-based', () => {
  it('any generated CPF passes validation', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (seed) => {
        const rng = mulberry32(seed);
        const cpf = CPF.generate(rng);
        expect(cpf.value).toHaveLength(11);
        expect(CPF.isValid(cpf.value)).toBe(true);
      }),
    );
  });

  it('parsing a generated CPF returns an equal CPF (round-trip)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (seed) => {
        const cpf = CPF.generate(mulberry32(seed));
        const reparsed = CPF.parse(cpf.format());
        expect(reparsed.ok).toBe(true);
        if (reparsed.ok) expect(reparsed.value.equals(cpf)).toBe(true);
      }),
    );
  });

  it('flipping a check digit always invalidates the CPF', () => {
    // Check digits are uniquely determined by the first 9 digits, so any flip
    // at positions 9 or 10 must invalidate. (Flips in positions 0-8 can collide,
    // since multiple bases may share the same check-digit pair — that property
    // is weaker and not asserted here.)
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 9, max: 10 }),
        fc.integer({ min: 1, max: 9 }),
        (seed, position, delta) => {
          const cpf = CPF.generate(mulberry32(seed));
          const digits = cpf.value;
          const original = digits.charAt(position);
          const flipped = String((Number(original) + delta) % 10);
          const mutated = digits.slice(0, position) + flipped + digits.slice(position + 1);
          if (mutated === digits) return;
          expect(CPF.isValid(mutated)).toBe(false);
        },
      ),
    );
  });

  it('generator retries when the RNG produces a repdigit base', () => {
    let call = 0;
    const rng = (): number => {
      call++;
      // First 9 draws → all zeros (repdigit "000000000"); after that, varied.
      if (call <= 9) return 0;
      return ((call * 37) % 9) / 10 + 0.05;
    };
    const cpf = CPF.generate(rng);
    expect(CPF.isValid(cpf.value)).toBe(true);
    expect(/^(\d)\1{10}$/.test(cpf.value)).toBe(false);
  });

  it('rejects all repdigit CPFs', () => {
    for (let d = 0; d <= 9; d++) {
      const repdigit = String(d).repeat(11);
      expect(CPF.isValid(repdigit)).toBe(false);
    }
  });

  it('InvalidCPFError exposes the original input', () => {
    const r = CPF.parse('not-a-cpf');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(InvalidCPFError);
      expect(r.error.input).toBe('not-a-cpf');
    }
  });
});

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
