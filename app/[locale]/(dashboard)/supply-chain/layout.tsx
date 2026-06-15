/**
 * app/[locale]/(dashboard)/supply-chain/layout.tsx
 * -------------------------------------------------------------
 * Server-side RBAC guard for the Supply Chain module (copy of the Lab/Sales
 * guard with the slug changed to 'supply').
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { can } from '@/lib/auth/rbac';

export default async function SupplyChainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!can(session?.user?.roles, 'supply-chain')) {
    redirect(`/${locale}/forbidden`);
  }

  return <>{children}</>;
}
