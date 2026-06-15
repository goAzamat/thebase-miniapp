/**
 * app/[locale]/(dashboard)/sales/page.tsx
 * -------------------------------------------------------------
 * Sales → S&OP Command Center. RSC-prefetches the Predictive Demand Engine
 * payload (CRM leads enriched with factory + recipe context) and hydrates it
 * into the dark command-center view. RBAC enforced by sales/layout.tsx.
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getSalesIntel } from '@/features/sales/server';
import { salesKeys } from '@/features/sales/queries';
import { CommandCenterView } from '@/components/modules/sales/command-center-view';

export default async function SalesPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: salesKeys.intel(),
    queryFn: getSalesIntel,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CommandCenterView />
    </HydrationBoundary>
  );
}
