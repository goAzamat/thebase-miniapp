/**
 * app/[locale]/(dashboard)/admin/layout.tsx — RBAC guard ('admin').
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { can } from '@/lib/auth/rbac';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!can(session?.user?.roles, 'admin')) redirect(`/${locale}/forbidden`);
  return <>{children}</>;
}
