/**
 * app/[locale]/(dashboard)/lab/formulas/page.tsx
 * -------------------------------------------------------------
 * Lab → Formula Finder. Same RSC-prefetch + HydrationBoundary pattern as the
 * briefs page; access is guaranteed by the parent lab/layout.tsx guard.
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getFormulas } from '@/features/lab/server';
import { labKeys } from '@/features/lab/queries';
import { FormulasView } from '@/components/modules/lab/formulas-view';

export default async function FormulasPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: labKeys.formulas(),
    queryFn: getFormulas,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FormulasView />
    </HydrationBoundary>
  );
}
