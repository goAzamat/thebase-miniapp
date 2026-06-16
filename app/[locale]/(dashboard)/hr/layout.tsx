/**
 * app/[locale]/(dashboard)/hr/layout.tsx — RBAC guard ('hr').
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { can } from '@/lib/auth/rbac';

export default async function HrLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!can(session?.user?.roles, 'hr')) redirect(`/${locale}/forbidden`);
  return <>{children}</>;
}
