/**
 * i18n/routing.ts
 * -------------------------------------------------------------
 * Shared next-intl routing definition. Imported by middleware.ts and by the
 * locale-aware navigation helpers (i18n/navigation.ts). Kept tiny and
 * edge-safe (no Node imports).
 */
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ru', 'ar'],
  defaultLocale: 'en',
  // 'always' → every URL is /<locale>/... which keeps the RBAC path parsing
  // in middleware.ts simple and predictable.
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
