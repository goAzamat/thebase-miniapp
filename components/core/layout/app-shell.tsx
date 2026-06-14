'use client';
/**
 * components/core/layout/app-shell.tsx
 * -------------------------------------------------------------
 * Shared dashboard chrome used by EVERY module:
 *   - desktop sidebar + mobile drawer (hamburger),
 *   - role-filtered navigation built from config/modules.ts via rbac.can(),
 *   - topbar with locale switcher (EN/RU) and a user-profile dropdown.
 *
 * Receives only serializable props (user name + roles) from the server
 * layout; lucide icons are resolved here from the client-side registry.
 */
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';
import { Menu, X, ChevronDown, LogOut, Globe } from 'lucide-react';

import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { MODULES } from '@/config/modules';
import { can, type AppRole } from '@/lib/auth/rbac';

type Props = {
  user: { name: string; roles: AppRole[] };
  children: React.ReactNode;
};

export function AppShell({ user, children }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname(); // locale-stripped, e.g. "/lab/briefs"
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const modules = MODULES.filter((m) => can(user.roles, m.slug));
  const initials = user.name.trim().slice(0, 1).toUpperCase() || 'U';

  function switchLocale(next: string) {
    // Re-render the same path under a different locale.
    router.replace(pathname, { locale: next });
  }

  const NavLinks = (
    <nav className="space-y-1">
      {modules.map((m) => {
        const active = pathname === m.path || pathname.startsWith(`${m.path}/`);
        const Icon = m.icon;
        return (
          <Link
            key={m.slug}
            href={m.path}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? 'bg-[#f0e6d8] text-[#1d1a17]'
                : 'text-[#6f6457] hover:bg-[#f4ece1] hover:text-[#1d1a17]'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {t(`nav.${m.labelKey}`)}
          </Link>
        );
      })}
    </nav>
  );

  const Brand = (
    <div className="px-3 py-1">
      <div className="font-serif text-xl tracking-[0.22em] text-[#1d1a17]">
        THE <span className="text-[#9c6b43]">BASE</span>
      </div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#9a8a78]">
        {t('common.tagline')}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f2ec] text-[#1d1a17]">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 start-0 hidden w-64 flex-col border-e border-[#e7ded3] bg-white lg:flex">
        <div className="border-b border-[#eee4d7] p-4">{Brand}</div>
        <div className="flex-1 overflow-y-auto p-3">{NavLinks}</div>
      </aside>

      {/* ---------- Mobile drawer ---------- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 flex w-64 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#eee4d7] p-4">
              {Brand}
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-[#6f6457] hover:bg-[#f4ece1]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">{NavLinks}</div>
          </aside>
        </div>
      )}

      {/* ---------- Main column ---------- */}
      <div className="lg:ps-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e7ded3] bg-[#f6f2ec]/80 px-4 backdrop-blur">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label={t('shell.menu')}
            className="rounded-md p-2 text-[#6f6457] hover:bg-[#efe6da] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="ms-auto flex items-center gap-3">
            {/* Locale switcher */}
            <div className="flex items-center overflow-hidden rounded-lg border border-[#e0d5c7] bg-white text-xs font-semibold">
              <Globe className="ms-2 h-3.5 w-3.5 text-[#9a8a78]" />
              {(['en', 'ru'] as const).map((lng) => (
                <button
                  key={lng}
                  onClick={() => switchLocale(lng)}
                  className={`px-2.5 py-1.5 uppercase transition ${
                    locale === lng
                      ? 'bg-[#9c6b43] text-white'
                      : 'text-[#6f6457] hover:bg-[#f4ece1]'
                  }`}
                >
                  {lng}
                </button>
              ))}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((s) => !s)}
                className="flex items-center gap-2 rounded-lg border border-[#e0d5c7] bg-white py-1.5 ps-1.5 pe-2.5 transition hover:bg-[#faf6f0]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#9c6b43] text-xs font-bold text-white">
                  {initials}
                </span>
                <span className="hidden max-w-[140px] truncate text-sm font-medium sm:block">
                  {user.name}
                </span>
                <ChevronDown className="h-4 w-4 text-[#9a8a78]" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute end-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-[#e7ded3] bg-white shadow-lg">
                    <div className="border-b border-[#f0e8dd] px-4 py-3">
                      <div className="truncate text-sm font-semibold">{user.name}</div>
                    </div>
                    <button
                      onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#b5462f] transition hover:bg-[#faf0ec]"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('shell.signOut')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
