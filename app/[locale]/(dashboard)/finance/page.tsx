/**
 * app/[locale]/(dashboard)/finance/page.tsx — Executive Control Tower ledger.
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getFinancialSnapshot } from '@/features/shared/server';
import { sharedKeys } from '@/features/shared/queries';
import { FinanceTower } from '@/components/modules/finance/finance-tower';

export default async function FinancePage() {
  const qc = new QueryClient();
  await qc.prefetchQuery({ queryKey: sharedKeys.finance(), queryFn: getFinancialSnapshot });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <FinanceTower />
    </HydrationBoundary>
  );
}
