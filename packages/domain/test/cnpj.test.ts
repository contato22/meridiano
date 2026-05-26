import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { CNPJ, InvalidCNPJError } from '../src/cnpj/index.js';

const KNOWN_VALID = ['11.222.333/0001-81', '45.997.418/0001-53', '60.701.190/0001-04'];

const KNOWN_INVALID = [
  '00.000.000/0000-00',
  '11.111.111/1111-11',
  '11.222.333/0001-82', // wrong d2
  '11.222.333/0001-91', // wrong d1
  '11.222.333/0002-81', // wrong branch alters check
  '12345',
  '',
];

describe('CNPJ — known fixtures', () => {
  it.each(KNOWN_VALID)('accepts valid CNPJ %s', (input) => {
    expect(CNPJ.parse(input).ok).toBe(true);
  });

  it.each(KNOWN_INVALID)('rejects invalid CNPJ %s', (input) => {
    expect(CNPJ.parse(input).ok).toBe(false);
  });
});

describe('CNPJ — formatting, root and branch', () => {
  it('formats canonically and exposes root / branch', () => {
    const r = CNPJ.parse('11.222.333/0001-81');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.value).toBe('11222333000181');
      expect(r.value.format()).toBe('11.222.333/0001-81');
      expect(r.value.root).toBe('11222333');
      expect(r.value.branch).toBe('0001');
      expect(r.value.isHeadquarters()).toBe(true);
      expect(JSON.stringify(r.value)).toBe('"11222333000181"');
    }
  });

  it('equals compares by digits regardless of formatting', () => {
    const a = CNPJ.parse('11.222.333/0001-81');
    const b = CNPJ.parse('11222333000181');
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.value.equals(b.value)).toBe(true);
  });
});

describe('CNPJ — property-based', () => {
  it('any generated CNPJ passes validation', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (seed) => {
        const cnpj = CNPJ.generate(mulberry32(seed));
        expect(cnpj.value).toHaveLength(14);
        expect(CNPJ.isValid(cnpj.value)).toBe(true);
      }),
    );
  });

  it('parsing a generated CNPJ returns an equal CNPJ (round-trip)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (seed) => {
        const cnpj = CNPJ.generate(mulberry32(seed));
        const reparsed = CNPJ.parse(cnpj.format());
        expect(reparsed.ok).toBe(true);
        if (reparsed.ok) expect(reparsed.value.equals(cnpj)).toBe(true);
      }),
    );
  });

  it('flipping a check digit always invalidates the CNPJ', () => {
    // Check digits are uniquely determined by the first 12 digits, so any flip
    // at positions 12 or 13 must invalidate. Flips in the base can collide and
    // are not asserted here.
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 12, max: 13 }),
        fc.integer({ min: 1, max: 9 }),
        (seed, position, delta) => {
          const cnpj = CNPJ.generate(mulberry32(seed));
          const digits = cnpj.value;
          const original = digits.charAt(position);
          const flipped = String((Number(original) + delta) % 10);
          const mutated = digits.slice(0, position) + flipped + digits.slice(position + 1);
          if (mutated === digits) return;
          expect(CNPJ.isValid(mutated)).toBe(false);
        },
      ),
    );
  });

  it('generator retries when the RNG produces a repdigit base', () => {
    let call = 0;
    const rng = (): number => {
      call++;
      if (call <= 12) return 0;
      return ((call * 41) % 9) / 10 + 0.05;
    };
    const cnpj = CNPJ.generate(rng);
    expect(CNPJ.isValid(cnpj.value)).toBe(true);
    expect(/^(\d)\1{13}$/.test(cnpj.value)).toBe(false);
  });

  it('rejects all repdigit CNPJs', () => {
    for (let d = 0; d <= 9; d++) {
      expect(CNPJ.isValid(String(d).repeat(14))).toBe(false);
    }
  });

  it('InvalidCNPJError exposes the original input', () => {
    const r = CNPJ.parse('not-a-cnpj');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(InvalidCNPJError);
      expect(r.error.input).toBe('not-a-cnpj');
    }
  });

  it('rejects non-string inputs', () => {
    // @ts-expect-error testing runtime guard
    const r = CNPJ.parse(11222333000181);
    expect(r.ok).toBe(false);
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
