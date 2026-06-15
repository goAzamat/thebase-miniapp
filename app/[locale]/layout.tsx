/**
 * app/[locale]/layout.tsx
 * -------------------------------------------------------------
 * Root layout for every localized route. Responsibilities:
 *   - validate the [locale] segment,
 *   - set <html lang> and dir (rtl for Arabic),
 *   - provide i18n messages to client components (NextIntlClientProvider),
 *   - provide the React Query cache (ReactQueryProvider).
 *
 * This is a Server Component; providers are the only client boundary.
 */
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import { ReactQueryProvider } from '@/lib/react-query/provider';
import './../globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'], display: 'swap' });

export const metadata: Metadata = {
  title: 'THE BASE — Portal',
  description: 'Headless ERP portal for THE BASE.',
};

/** Pre-render all locales at build time. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Reject unknown locales (e.g. /xx/...).
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Enable static rendering for this request's locale.
  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className={inter.className}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
