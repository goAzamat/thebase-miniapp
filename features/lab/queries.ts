/**
 * features/lab/queries.ts
 * -------------------------------------------------------------
 * React Query (Tier-B) hooks + key factory for the Lab module.
 */
import { useQuery } from '@tanstack/react-query';
import { getLabBriefs, getFormulas } from './server';
import type { LabBrief, Formula } from './schema';

export const labKeys = {
  all: ['lab'] as const,
  briefs: () => [...labKeys.all, 'briefs'] as const,
  formulas: () => [...labKeys.all, 'formulas'] as const,
  formula: (id: number) => [...labKeys.all, 'formula', id] as const,
};

export function useLabBriefs() {
  return useQuery<LabBrief[]>({
    queryKey: labKeys.briefs(),
    queryFn: () => getLabBriefs(),
    staleTime: 120_000, // 2 min — matches the briefs server TTL
  });
}

export function useFormulas() {
  return useQuery<Formula[]>({
    queryKey: labKeys.formulas(),
    queryFn: () => getFormulas(),
    staleTime: 900_000, // 15 min — matches the formulas server TTL
  });
}
