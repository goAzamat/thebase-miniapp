/**
 * app/[locale]/(dashboard)/layout.tsx
 * -------------------------------------------------------------
 * Authenticated shell for every dashboard route. Server Component:
 *   - requires a session (redirect to login otherwise),
 *   - passes the user's name + roles to the client <AppShell>, which renders
 *     the role-filtered sidebar, topbar and locale switcher.
 *
 * Per-module access is still asserted again in each module layout
 * (e.g. lab/layout.tsx) — defense in depth.
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { AppShell } from '@/components/core/layout/app-shell';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return (
    <AppShell user={{ name: session.user.name ?? 'User', roles: session.user.roles }}>
      {children}
    </AppShell>
  );
}
