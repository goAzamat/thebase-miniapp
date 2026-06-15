/**
 * features/sales/queries.ts
 * -------------------------------------------------------------
 * React Query hook + key factory for the Sales module.
 */
import { useQuery } from '@tanstack/react-query';
import { getActiveLeads, getSalesIntel } from './server';
import type { Lead, SalesIntel } from './schema';

export const salesKeys = {
  all: ['sales'] as const,
  leads: () => [...salesKeys.all, 'leads'] as const,
  intel: () => [...salesKeys.all, 'intel'] as const,
};

export function useActiveLeads() {
  return useQuery<Lead[]>({
    queryKey: salesKeys.leads(),
    queryFn: () => getActiveLeads(),
    staleTime: 120_000,
  });
}

export function useSalesIntel() {
  return useQuery<SalesIntel>({
    queryKey: salesKeys.intel(),
    queryFn: () => getSalesIntel(),
    staleTime: 120_000,
  });
}
