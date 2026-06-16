/**
 * app/[locale]/(dashboard)/production/layout.tsx — RBAC guard ('production').
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { can } from '@/lib/auth/rbac';

export default async function ProductionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!can(session?.user?.roles, 'production')) redirect(`/${locale}/forbidden`);
  return <>{children}</>;
}
