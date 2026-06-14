'use client';
/**
 * components/modules/lab/lab-nav.tsx
 * -------------------------------------------------------------
 * Reusable intra-module tab bar for the Lab module (Briefs | Formulas).
 * Rendered once in lab/layout.tsx so it appears on every Lab page directly
 * under the Topbar. Active state is derived from the locale-stripped path.
 */
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

const TABS = [
  { href: '/lab', key: 'briefs', exact: true },
  { href: '/lab/formulas', key: 'formulas', exact: false },
  { href: '/lab/ingredients', key: 'ingredients', exact: false },
] as const;

export function LabNav() {
  const t = useTranslations('labNav');
  const pathname = usePathname();

  return (
    <div className="mb-6 border-b border-[#e7ded3]">
      <nav className="flex gap-1">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                active
                  ? 'border-[#9c6b43] text-[#1d1a17]'
                  : 'border-transparent text-[#9a8a78] hover:text-[#6f6457]'
              }`}
            >
              {t(tab.key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
