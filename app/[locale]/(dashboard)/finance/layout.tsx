/**
 * app/[locale]/(dashboard)/finance/layout.tsx — RBAC guard ('finance').
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { can } from '@/lib/auth/rbac';

export default async function FinanceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!can(session?.user?.roles, 'finance')) redirect(`/${locale}/forbidden`);
  return <>{children}</>;
}
