/**
 * app/[locale]/(dashboard)/admin/page.tsx — Odoo API connection matrix + logs.
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getAdminIntegration } from '@/features/shared/server';
import { sharedKeys } from '@/features/shared/queries';
import { AdminMatrix } from '@/components/modules/admin/admin-matrix';

export default async function AdminPage() {
  const qc = new QueryClient();
  await qc.prefetchQuery({ queryKey: sharedKeys.admin(), queryFn: getAdminIntegration });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <AdminMatrix />
    </HydrationBoundary>
  );
}
