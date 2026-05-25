import { describe, expect, it } from 'vitest';
import { err, isErr, isOk, ok, unwrap } from '../src/result.js';

describe('Result', () => {
  it('ok / isOk identify success', () => {
    const r = ok(42);
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
    if (isOk(r)) expect(r.value).toBe(42);
  });

  it('err / isErr identify failure', () => {
    const e = new Error('boom');
    const r = err(e);
    expect(isErr(r)).toBe(true);
    expect(isOk(r)).toBe(false);
    if (isErr(r)) expect(r.error).toBe(e);
  });

  it('unwrap returns value on ok', () => {
    expect(unwrap(ok('hello'))).toBe('hello');
  });

  it('unwrap throws on err with Error instance', () => {
    expect(() => unwrap(err(new Error('boom')))).toThrow('boom');
  });

  it('unwrap wraps non-Error err values', () => {
    expect(() => unwrap(err('string-err'))).toThrow('string-err');
  });
});
