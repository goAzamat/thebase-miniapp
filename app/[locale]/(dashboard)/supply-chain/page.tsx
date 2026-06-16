/**
 * app/[locale]/(dashboard)/supply-chain/page.tsx
 * -------------------------------------------------------------
 * Procurement & Import Control Center (+ Fulfillment tracker tab). Prefetches
 * both datasets and hydrates the tabbed Supply Chain view.
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getFulfillment } from '@/features/supply-chain/server';
import { supplyKeys } from '@/features/supply-chain/queries';
import { getProcurement } from '@/features/procurement/server';
import { procurementKeys } from '@/features/procurement/queries';
import { SupplyChainView } from '@/components/modules/supply-chain/supply-chain-view';

export default async function SupplyChainPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({ queryKey: procurementKeys.data(), queryFn: getProcurement });
  await queryClient.prefetchQuery({ queryKey: supplyKeys.fulfillment(), queryFn: getFulfillment });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SupplyChainView />
    </HydrationBoundary>
  );
}
