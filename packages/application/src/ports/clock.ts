/**
 * Clock port — abstracts wall-clock time so use cases stay deterministic in
 * tests. Production wires `() => new Date()`; tests pass a fixed-time fake.
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};
