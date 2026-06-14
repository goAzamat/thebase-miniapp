/**
 * i18n/navigation.ts
 * -------------------------------------------------------------
 * Locale-aware navigation primitives. Use these instead of next/link and
 * next/navigation so the active locale prefix is handled automatically.
 *   - <Link>        : auto-prefixed links
 *   - usePathname() : returns the pathname WITHOUT the locale prefix
 *   - useRouter()   : .replace(path, { locale }) to switch language in place
 */
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
