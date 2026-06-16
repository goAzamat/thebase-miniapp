/**
 * app/[locale]/(dashboard)/hr/page.tsx — Headcount + factory floor allocation.
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getHrMetrics } from '@/features/shared/server';
import { sharedKeys } from '@/features/shared/queries';
import { HrView } from '@/components/modules/hr/hr-view';

export default async function HrPage() {
  const qc = new QueryClient();
  await qc.prefetchQuery({ queryKey: sharedKeys.hr(), queryFn: getHrMetrics });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <HrView />
    </HydrationBoundary>
  );
}
