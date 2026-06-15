/**
 * features/supply-chain/queries.ts
 * -------------------------------------------------------------
 * React Query hook + key factory for the Supply Chain module.
 */
import { useQuery } from '@tanstack/react-query';
import { getFulfillment } from './server';
import type { FulfillmentData } from './schema';

export const supplyKeys = {
  all: ['supply-chain'] as const,
  fulfillment: () => [...supplyKeys.all, 'fulfillment'] as const,
};

export function useFulfillment() {
  return useQuery<FulfillmentData>({
    queryKey: supplyKeys.fulfillment(),
    queryFn: () => getFulfillment(),
    staleTime: 60_000,
  });
}
