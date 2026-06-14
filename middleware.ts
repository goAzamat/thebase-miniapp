/**
 * middleware.ts
 * -------------------------------------------------------------
 * The router gate — composes, in order:
 *   1) next-intl   → resolve [locale], set <html lang/dir>, locale cookie
 *   2) Auth.js     → require a session on (dashboard) routes
 *   3) RBAC        → keep each role inside its allowed module(s)
 *
 * Runs in the EDGE runtime, so it imports ONLY edge-safe modules
 * (config.edge.ts + pure rbac.ts + i18n routing) — never lib/odoo/*.
 */
import createIntlMiddleware from 'next-intl/middleware';
import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';

import { routing } from '@/i18n/routing';
import { authConfigEdge } from '@/lib/auth/config.edge';
import { can, defaultModuleFor, moduleFromPath } from '@/lib/auth/rbac';

// Edge-only NextAuth instance (no Credentials/Node provider) — just reads the JWT.
const { auth } = NextAuth(authConfigEdge);

// next-intl handles locale detection, prefixing and rewrites.
const intlMiddleware = createIntlMiddleware(routing);

const { locales, defaultLocale } = routing;

/** Public, auth-free paths (locale prefix is stripped before matching). */
const PUBLIC_PATHS = ['/login', '/forbidden'];

/** Split "/en/lab/briefs" → { locale: "en", rest: "/lab/briefs" }. */
function splitLocale(pathname: string): { locale: string; rest: string } {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (locales.includes(seg as (typeof locales)[number])) {
    return { locale: seg, rest: pathname.slice(seg.length + 1) || '/' };
  }
  return { locale: defaultLocale, rest: pathname || '/' };
}

const localized = (locale: string, path: string) =>
  `/${locale}${path.startsWith('/') ? path : `/${path}`}`;

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth; // populated from the JWT by NextAuth
  const { locale, rest } = splitLocale(nextUrl.pathname);

  // 1) Let next-intl produce the base response (locale cookie / rewrite).
  const intlResponse = intlMiddleware(req);

  // 2) Public routes: no auth required.
  if (PUBLIC_PATHS.some((p) => rest === p || rest.startsWith(`${p}/`))) {
    return intlResponse;
  }

  // 3) Unauthenticated → send to localized login, remembering where they wanted to go.
  if (!session?.user) {
    const url = nextUrl.clone();
    url.pathname = localized(locale, '/login');
    url.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const roles = session.user.roles;

  // 4) Root → bounce to the user's default module.
  if (rest === '/' || rest === '') {
    const home = defaultModuleFor(roles);
    const url = nextUrl.clone();
    url.pathname = localized(locale, home ? `/${home}` : '/forbidden');
    return NextResponse.redirect(url);
  }

  // 5) RBAC: if the path targets a module the user can't open, redirect.
  const slug = moduleFromPath(rest);
  if (slug && !can(roles, slug)) {
    const home = defaultModuleFor(roles);
    const url = nextUrl.clone();
    url.pathname = localized(locale, home ? `/${home}` : '/forbidden');
    return NextResponse.redirect(url);
  }

  // Allowed → continue with the next-intl response.
  return intlResponse;
});

export const config = {
  // Run on everything except API, Next internals and static files.
  // (RBAC for /api/odoo/* is enforced inside those route handlers, not here.)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
