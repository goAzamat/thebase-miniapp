/**
 * app/[locale]/(dashboard)/production/page.tsx
 * -------------------------------------------------------------
 * Manufacturing Operations & QA — live batch + yield variance monitor.
 * RSC prefetch (mrp.production overlay with silent fallback) + hydration.
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getProductionData } from '@/features/production/server';
import { productionKeys } from '@/features/production/queries';
import { ManufacturingMatrix } from '@/components/modules/production/manufacturing-matrix';

export default async function ProductionPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({ queryKey: productionKeys.data(), queryFn: getProductionData });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ManufacturingMatrix />
    </HydrationBoundary>
  );
}
