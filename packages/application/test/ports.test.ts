import { describe, expect, it } from 'vitest';
import { cryptoIdGenerator, systemClock } from '../src/ports/index.js';

describe('production port instances', () => {
  it('systemClock.now returns a Date close to wall time', () => {
    const before = Date.now();
    const now = systemClock.now();
    const after = Date.now();
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThanOrEqual(after);
  });

  it('cryptoIdGenerator.next returns a UUID v4', () => {
    const id = cryptoIdGenerator.next();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('cryptoIdGenerator.next produces distinct values', () => {
    const a = cryptoIdGenerator.next();
    const b = cryptoIdGenerator.next();
    expect(a).not.toBe(b);
  });
});
