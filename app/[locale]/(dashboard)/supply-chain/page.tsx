/**
 * app/[locale]/(dashboard)/supply-chain/page.tsx
 * -------------------------------------------------------------
 * Supply Chain → Fulfillment & Batch Logistics. RSC prefetch + hydration,
 * same pattern as every other module.
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getFulfillment } from '@/features/supply-chain/server';
import { supplyKeys } from '@/features/supply-chain/queries';
import { FulfillmentView } from '@/components/modules/supply-chain/fulfillment-view';

export default async function SupplyChainPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: supplyKeys.fulfillment(),
    queryFn: getFulfillment,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FulfillmentView />
    </HydrationBoundary>
  );
}
