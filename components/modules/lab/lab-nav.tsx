'use client';
/**
 * components/modules/lab/lab-nav.tsx
 * -------------------------------------------------------------
 * Reusable intra-module tab bar for the Lab module
 * (Briefs | Formulas | Ingredients), with lucide icons and an amber accent.
 * Rendered once in lab/layout.tsx so it sits under the Topbar on every page.
 */
import { useTranslations } from 'next-intl';
import { ClipboardList, FlaskConical, Boxes, type LucideIcon } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';

const TABS: { href: string; key: string; exact: boolean; icon: LucideIcon }[] = [
  { href: '/lab', key: 'briefs', exact: true, icon: ClipboardList },
  { href: '/lab/formulas', key: 'formulas', exact: false, icon: FlaskConical },
  { href: '/lab/ingredients', key: 'ingredients', exact: false, icon: Boxes },
];

export function LabNav() {
  const t = useTranslations('labNav');
  const pathname = usePathname();

  return (
    <div className="mb-6 border-b border-[#e7ded3]">
      <nav className="flex gap-1">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                active
                  ? 'border-amber-500 text-amber-700'
                  : 'border-transparent text-[#9a8a78] hover:text-[#6f6457]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(tab.key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
