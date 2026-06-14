/**
 * types/next-auth.d.ts
 * -------------------------------------------------------------
 * Module augmentation so `session.user`, the JWT and the authorize() return
 * value are strongly typed with our portal fields. Without this, TypeScript
 * rejects `token.uid`, `session.user.roles`, etc.
 */
import type { DefaultSession } from 'next-auth';
import type { AppRole, ModuleSlug } from '@/lib/auth/rbac';

type Locale = 'en' | 'ru' | 'ar';

declare module 'next-auth' {
  /** Object returned by authorize() and merged into the JWT. */
  interface User {
    uid: number;
    roles: AppRole[];
    locale: Locale;
  }

  /** Client-safe session shape (NO Odoo key — never exposed to the browser). */
  interface Session {
    user: {
      uid: number;
      roles: AppRole[];
      locale: Locale;
      defaultModule: ModuleSlug | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid: number;
    roles: AppRole[];
    locale: Locale;
  }
}
