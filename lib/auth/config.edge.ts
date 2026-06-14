/**
 * lib/auth/config.edge.ts
 * -------------------------------------------------------------
 * EDGE-SAFE Auth.js base config.
 *
 * Why this file exists:
 *   NextAuth v5 middleware runs in the Edge runtime. Our Credentials
 *   provider's authorize() calls Odoo over XML-RPC (Node `net`/`http`),
 *   which is NOT available on Edge. So we split the config:
 *
 *     • config.edge.ts (this file) — callbacks + pages only, ZERO Node
 *       imports. Used by middleware.ts (and spread into the full config).
 *     • config.ts — adds the Credentials provider (Node) for the route
 *       handler that actually performs sign-in.
 *
 * The jwt/session callbacks here only RESHAPE the token, which is fine on
 * Edge — they never touch Odoo.
 */
import type { NextAuthConfig } from 'next-auth';
import { defaultModuleFor } from './rbac';

export const authConfigEdge: NextAuthConfig = {
  session: { strategy: 'jwt' },

  // Custom pages (locale prefix is added by middleware/next-intl).
  pages: {
    signIn: '/login',
    error: '/login',
  },

  // Providers are injected in config.ts (Node). Empty here keeps Edge clean.
  providers: [],

  callbacks: {
    /**
     * Persist identity into the JWT at sign-in. `user` is only present on the
     * first call (right after authorize()); afterwards the token carries it.
     * We deliberately store NO Odoo key here — reads use the service account.
     */
    jwt({ token, user }) {
      if (user) {
        token.uid = user.uid;
        token.roles = user.roles;
        token.locale = user.locale;
      }
      return token;
    },

    /**
     * Expose a typed, CLIENT-SAFE session. Derived `defaultModule` saves the
     * client a round-trip when redirecting to the user's landing page.
     */
    session({ session, token }) {
      session.user.uid = token.uid;
      session.user.roles = token.roles;
      session.user.locale = token.locale;
      session.user.defaultModule = defaultModuleFor(token.roles);
      return session;
    },
  },
};

export default authConfigEdge;
