/**
 * app/[locale]/(dashboard)/production/page.tsx
 * Live batches + Yield Variance, plus the predictive demand-vs-capacity header.
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getProductionBatches, getPipelineMetrics } from '@/features/shared/server';
import { sharedKeys } from '@/features/shared/queries';
import { ProductionBoard } from '@/components/modules/production/production-board';

export default async function ProductionPage() {
  const qc = new QueryClient();
  await qc.prefetchQuery({ queryKey: sharedKeys.production(), queryFn: getProductionBatches });
  await qc.prefetchQuery({ queryKey: sharedKeys.pipeline(), queryFn: getPipelineMetrics });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ProductionBoard />
    </HydrationBoundary>
  );
}
