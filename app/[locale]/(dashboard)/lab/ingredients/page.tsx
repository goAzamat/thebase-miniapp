/**
 * app/[locale]/(dashboard)/lab/ingredients/page.tsx
 * -------------------------------------------------------------
 * Lab → Ingredients (raw-material catalog). Same RSC-prefetch +
 * HydrationBoundary pattern; access guaranteed by lab/layout.tsx.
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getIngredients } from '@/features/lab/server';
import { labKeys } from '@/features/lab/queries';
import { IngredientsView } from '@/components/modules/lab/ingredients-view';

export default async function IngredientsPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: labKeys.ingredients(),
    queryFn: getIngredients,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <IngredientsView />
    </HydrationBoundary>
  );
}
