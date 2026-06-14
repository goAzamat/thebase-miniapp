/**
 * app/[locale]/(dashboard)/sales/page.tsx
 * -------------------------------------------------------------
 * Sales → Pipeline. Identical RSC-prefetch + HydrationBoundary pattern as
 * the Lab pages. RBAC is enforced by sales/layout.tsx (assertAccess('sales')
 * equivalent via can()), plus the dashboard layout's auth() and middleware.
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getActiveLeads } from '@/features/sales/server';
import { salesKeys } from '@/features/sales/queries';
import { PipelineView } from '@/components/modules/sales/pipeline-view';

export default async function SalesPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: salesKeys.leads(),
    queryFn: getActiveLeads,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PipelineView />
    </HydrationBoundary>
  );
}
