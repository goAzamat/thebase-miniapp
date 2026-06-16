/**
 * features/finance/queries.ts
 * -------------------------------------------------------------
 * React Query hook + key factory for the Finance Control Tower.
 */
import { useQuery } from '@tanstack/react-query';
import { getFinanceControl } from './server';
import type { FinanceControlData } from './schema';

export const financeKeys = {
  all: ['finance'] as const,
  control: () => [...financeKeys.all, 'control'] as const,
};

export function useFinanceControl() {
  return useQuery<FinanceControlData>({
    queryKey: financeKeys.control(),
    queryFn: () => getFinanceControl(),
    staleTime: 60_000,
  });
}
