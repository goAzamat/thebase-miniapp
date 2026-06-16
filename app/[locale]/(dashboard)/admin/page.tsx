/**
 * app/[locale]/(dashboard)/admin/page.tsx
 * -------------------------------------------------------------
 * Module 7 — Integration Console & Governance Admin. RSC prefetch of the
 * ping board + idempotency ledger + governance gates, then hydration.
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getAdminConsole } from '@/features/admin/server';
import { adminConsoleKeys } from '@/features/admin/queries';
import { IntegrationConsole } from '@/components/modules/admin/integration-console';

export default async function AdminPage() {
  const qc = new QueryClient();
  await qc.prefetchQuery({ queryKey: adminConsoleKeys.data(), queryFn: getAdminConsole });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <IntegrationConsole />
    </HydrationBoundary>
  );
}
