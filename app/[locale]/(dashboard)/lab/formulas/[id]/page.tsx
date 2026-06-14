/**
 * app/[locale]/(dashboard)/lab/formulas/[id]/page.tsx
 * -------------------------------------------------------------
 * Formula detail — RSC prefetch of the per-id breakdown into the React Query
 * cache, then hydrated into the client detail view. Access guaranteed by the
 * parent lab/layout.tsx guard.
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getFormulaDetails } from '@/features/lab/server';
import { labKeys } from '@/features/lab/queries';
import { FormulaDetailView } from '@/components/modules/lab/formula-detail-view';

export default async function FormulaDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const formulaId = Number(id);

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: labKeys.formula(formulaId),
    queryFn: () => getFormulaDetails(formulaId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FormulaDetailView id={formulaId} />
    </HydrationBoundary>
  );
}
