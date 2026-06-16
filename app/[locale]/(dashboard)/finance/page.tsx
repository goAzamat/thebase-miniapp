/**
 * app/[locale]/(dashboard)/finance/page.tsx
 * -------------------------------------------------------------
 * Finance Control Tower & Cost Leakage Auditor (COPQ, AR credit lock,
 * project governance). RSC prefetch + hydration.
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getFinanceControl } from '@/features/finance/server';
import { financeKeys } from '@/features/finance/queries';
import { FinanceTower } from '@/components/modules/finance/finance-tower';

export default async function FinancePage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({ queryKey: financeKeys.control(), queryFn: getFinanceControl });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FinanceTower />
    </HydrationBoundary>
  );
}
