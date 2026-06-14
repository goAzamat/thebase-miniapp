/**
 * app/[locale]/(dashboard)/lab/page.tsx
 * -------------------------------------------------------------
 * Lab dashboard — Client Briefs.
 *
 * RSC PREFETCH + HYDRATION: we run the cached Server Action on the server,
 * dehydrate the React Query cache, and hand it to <HydrationBoundary>. The
 * client <LabBriefsView> then reads from that cache with zero loading
 * waterfall on first paint, and refreshes in the background once stale.
 *
 * Access is already guaranteed by lab/layout.tsx (RBAC) and the dashboard
 * layout (auth).
 */
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getLabBriefs } from '@/features/lab/server';
import { labKeys } from '@/features/lab/queries';
import { LabBriefsView } from '@/components/modules/lab/briefs-view';

export default async function LabPage() {
  const queryClient = new QueryClient();

  // Prefetch on the server (hits the Tier-A shared cache, not Odoo directly
  // unless the window has expired).
  await queryClient.prefetchQuery({
    queryKey: labKeys.briefs(),
    queryFn: getLabBriefs,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LabBriefsView />
    </HydrationBoundary>
  );
}
