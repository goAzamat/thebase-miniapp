/**
 * features/hr/queries.ts
 * -------------------------------------------------------------
 * React Query hook + key factory for the Labor Operations module.
 */
import { useQuery } from '@tanstack/react-query';
import { getHrLabor } from './server';
import type { HrLaborData } from './schema';

export const hrKeys = {
  all: ['hr'] as const,
  labor: () => [...hrKeys.all, 'labor'] as const,
};

export function useHrLabor() {
  return useQuery<HrLaborData>({
    queryKey: hrKeys.labor(),
    queryFn: () => getHrLabor(),
    staleTime: 60_000,
  });
}
