import { NextResponse, type NextRequest } from 'next/server';

/**
 * Provisional access gate.
 *
 * Until Clerk is wired (PR-B follow-up + credentials), the deployed app is
 * protected by HTTP Basic Auth at the edge. Set `ACCESS_USER` and
 * `ACCESS_PASSWORD` in the deployment environment (Vercel project settings).
 * Without the env vars, the middleware lets every request through — that
 * mode is intentional for `pnpm dev` so the local dev experience isn't
 * gated.
 *
 * When Clerk lands this file becomes a `clerkMiddleware()` call protecting
 * `/(dashboard)/*` and the basic-auth branch is removed.
 *
 * Edge runtime: no Node APIs, no `process.env` indirection — all access via
 * the typed `getEnv` helper. We're explicit about which env vars are read.
 */

const ALLOWED_WITHOUT_AUTH = ['/_next', '/favicon.ico', '/robots.txt'];

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (ALLOWED_WITHOUT_AUTH.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const expectedUser = process.env['ACCESS_USER'];
  const expectedPassword = process.env['ACCESS_PASSWORD'];

  // Gate disabled if either var is missing. Useful for local dev; in
  // production both should be set in the Vercel project settings.
  if (!expectedUser || !expectedPassword) {
    return NextResponse.next();
  }

  const header = req.headers.get('authorization') ?? '';
  if (!header.startsWith('Basic ')) {
    return unauthorized();
  }

  const decoded = atob(header.slice('Basic '.length));
  const sep = decoded.indexOf(':');
  if (sep === -1) return unauthorized();

  const user = decoded.slice(0, sep);
  const password = decoded.slice(sep + 1);

  if (!timingSafeEqualStr(user, expectedUser) || !timingSafeEqualStr(password, expectedPassword)) {
    return unauthorized();
  }

  return NextResponse.next();
}

function unauthorized(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Meridiano (dev preview)"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

// Constant-time string compare so a chunked attacker can't recover the
// password byte-by-byte. Falls back to char-by-char XOR because the Edge
// runtime doesn't ship `crypto.timingSafeEqual`.
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const config = {
  // Run on every path; the gate decides what passes through.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
