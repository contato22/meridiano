/**
 * Identity generator port. Production: crypto.randomUUID. Tests: deterministic.
 */
export interface IdGenerator {
  next(): string;
}

export const cryptoIdGenerator: IdGenerator = {
  next: () => crypto.randomUUID(),
};
