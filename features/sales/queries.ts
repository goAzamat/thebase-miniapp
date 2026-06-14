/**
 * features/sales/queries.ts
 * -------------------------------------------------------------
 * React Query hook + key factory for the Sales module.
 */
import { useQuery } from '@tanstack/react-query';
import { getActiveLeads } from './server';
import type { Lead } from './schema';

export const salesKeys = {
  all: ['sales'] as const,
  leads: () => [...salesKeys.all, 'leads'] as const,
};

export function useActiveLeads() {
  return useQuery<Lead[]>({
    queryKey: salesKeys.leads(),
    queryFn: () => getActiveLeads(),
    staleTime: 120_000,
  });
}
