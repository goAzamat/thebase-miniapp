/**
 * app/[locale]/(dashboard)/sales/layout.tsx
 * -------------------------------------------------------------
 * Server-side RBAC guard for the Sales module — a literal copy of
 * lab/layout.tsx with the slug changed to 'sales'. THIS is the copy-paste:
 * no Core file was touched to add a department.
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { can } from '@/lib/auth/rbac';

export default async function SalesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!can(session?.user?.roles, 'sales')) {
    redirect(`/${locale}/forbidden`);
  }

  return <>{children}</>;
}
