/**
 * app/[locale]/(dashboard)/hr/page.tsx
 * -------------------------------------------------------------
 * Labor Operations & Quality Compliance — OEE matrix, HACCP sanitary gate and
 * R&D formulation velocity. RSC prefetch + hydration.
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getHrLabor } from '@/features/hr/server';
import { hrKeys } from '@/features/hr/queries';
import { HrLaborMatrix } from '@/components/modules/hr/hr-labor-matrix';

export default async function HrPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({ queryKey: hrKeys.labor(), queryFn: getHrLabor });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HrLaborMatrix />
    </HydrationBoundary>
  );
}
