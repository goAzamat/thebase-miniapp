/**
 * app/[locale]/(auth)/forbidden/page.tsx
 * -------------------------------------------------------------
 * Premium 403 page. Shown when RBAC blocks a user from a module.
 * Server Component — purely presentational, links back to the dashboard
 * root (which resolves to the user's default module).
 */
import { getTranslations } from 'next-intl/server';
import { ShieldAlert } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export default async function ForbiddenPage() {
  const t = await getTranslations('forbidden');

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#161210] px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#b5462f] opacity-15 blur-[120px]"
      />
      <div className="relative w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#4a2a22] bg-[#2a1a16]">
          <ShieldAlert className="h-8 w-8 text-[#e0916f]" />
        </div>

        <p className="mb-2 font-serif text-5xl text-[#f3ece2]">403</p>
        <h1 className="mb-3 font-serif text-2xl text-[#f3ece2]">{t('title')}</h1>
        <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-[#9a8a78]">
          {t('message')}
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-[#c79161] px-5 py-2.5 text-sm font-semibold text-[#1a130c] transition hover:bg-[#d6a273]"
        >
          {t('back')}
        </Link>
      </div>
    </main>
  );
}
