/**
 * Strongly-typed server-side env access. Read from this module instead of
 * `process.env.X` directly so missing vars fail at boot rather than mid-request,
 * and so the set of expected vars is documented in one place.
 *
 * Browser-safe vars must be prefixed with `NEXT_PUBLIC_` (Next.js convention).
 */
type EnvKey = 'NEXT_PUBLIC_APP_URL';
// PR-B will add: DATABASE_URL, CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, etc.

export function getEnv(key: EnvKey, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export function getEnvOptional(key: EnvKey): string | undefined {
  return process.env[key];
}
