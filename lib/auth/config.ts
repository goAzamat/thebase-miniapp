/**
 * lib/auth/config.ts
 * -------------------------------------------------------------
 * FULL Auth.js (NextAuth v5) instance — Node runtime.
 *
 * Adds the Credentials provider whose authorize() talks to Odoo, then spreads
 * the edge-safe base (callbacks/pages) from config.edge.ts.
 *
 * Exports the standard NextAuth handles:
 *   - handlers → app/api/auth/[...nextauth]/route.ts
 *   - auth     → server-side session in RSC / API routes / server actions
 *   - signIn / signOut → server actions
 *
 * This module imports lib/odoo/* (xmlrpc, Node) and therefore must NEVER be
 * imported from middleware.ts — middleware uses config.edge.ts instead.
 */
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { authConfigEdge } from './config.edge';
import { mapGroupsToRoles } from './rbac';
import { authenticateOdoo, fetchUserProfile } from '@/lib/odoo/auth';

/** Map an Odoo language code to one of our supported locales. */
function localeFromOdooLang(lang: string): 'en' | 'ru' | 'ar' {
  if (lang.startsWith('ru')) return 'ru';
  if (lang.startsWith('ar')) return 'ar';
  return 'en';
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfigEdge,

  providers: [
    Credentials({
      id: 'odoo',
      name: 'Odoo',
      credentials: {
        login: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      /**
       * Runs ONLY in the Node sign-in route (never on Edge).
       * 1) verify the human's own Odoo email + password,
       * 2) read their groups → app roles,
       * 3) reject if they hold no portal role,
       * 4) return a minimal, secret-free user object for the JWT.
       */
      async authorize(credentials) {
        const login = String(credentials?.login ?? '').trim();
        const password = String(credentials?.password ?? '');
        if (!login || !password) return null;

        // common.authenticate accepts the user's standard Odoo password here.
        const uid = await authenticateOdoo(login, password);
        if (!uid) return null; // invalid Odoo credentials

        const profile = await fetchUserProfile(uid, password);
        const roles = mapGroupsToRoles(profile.groups);
        if (roles.length === 0) return null; // authenticated but not provisioned for the portal

        // The returned object is merged into the JWT by the jwt() callback.
        // NOTE: we intentionally do NOT return the Odoo apiKey — it is discarded here.
        return {
          id: String(uid),
          name: profile.name,
          email: profile.login,
          uid,
          roles,
          locale: localeFromOdooLang(profile.lang),
        };
      },
    }),
  ],
});
