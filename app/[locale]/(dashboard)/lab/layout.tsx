/**
 * app/[locale]/(dashboard)/lab/layout.tsx
 * -------------------------------------------------------------
 * Server-side RBAC guard for the Lab / R&D module — the REAL security
 * boundary (middleware is only the first, bypassable line of defense).
 *
 * Runs on the server on every navigation into /lab/*. A user without the
 * `rd` (or `admin`) role is redirected to the localized /forbidden page and
 * never receives the module's data or UI.
 *
 * Node runtime: auth() → lib/auth/config.ts → lib/odoo (xmlrpc).
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { can } from '@/lib/auth/rbac';
import { LabNav } from '@/components/modules/lab/lab-nav';

export default async function LabLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  // Defense-in-depth: assert access server-side regardless of middleware.
  if (!can(session?.user?.roles, 'lab')) {
    redirect(`/${locale}/forbidden`);
  }

  // The shared dashboard shell (sidebar/topbar) lives in
  // app/[locale]/(dashboard)/layout.tsx. Here we add the Lab tab bar above
  // every Lab page.
  return (
    <>
      <LabNav />
      {children}
    </>
  );
}
