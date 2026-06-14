'use client';
/**
 * lib/react-query/provider.tsx
 * -------------------------------------------------------------
 * Client-side React Query provider (Tier-B cache from the architecture doc).
 *
 * - One QueryClient per browser (memoized), a fresh one per request on the
 *   server to avoid cross-request state leaks during SSR/streaming.
 * - Defaults are conservative to protect Odoo: a 60s baseline staleTime,
 *   no refetch-on-focus, single retry. Per-query staleTime in
 *   features/<module>/queries.ts overrides this to match the server TTLs.
 */
import { QueryClient, QueryClientProvider, isServer } from '@tanstack/react-query';
import { useState } from 'react';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // 1 min baseline
        gcTime: 1000 * 60 * 30, // 30 min
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) return makeQueryClient();
  return (browserQueryClient ??= makeQueryClient());
}

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  // useState ensures the same client instance is reused across re-renders.
  const [queryClient] = useState(getQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
