/**
 * features/lab/queries.ts
 * -------------------------------------------------------------
 * React Query (Tier-B) hooks + key factory for the Lab module.
 */
import { useQuery } from '@tanstack/react-query';
import { getLabBriefs, getFormulas, getFormulaDetails, getIngredients } from './server';
import type { LabBrief, Formula, FormulaDetail, Ingredient } from './schema';

export const labKeys = {
  all: ['lab'] as const,
  briefs: () => [...labKeys.all, 'briefs'] as const,
  formulas: () => [...labKeys.all, 'formulas'] as const,
  formula: (id: number) => [...labKeys.all, 'formula', id] as const,
  ingredients: () => [...labKeys.all, 'ingredients'] as const,
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

export function useFormulaDetail(id: number) {
  return useQuery<FormulaDetail | null>({
    queryKey: labKeys.formula(id),
    queryFn: () => getFormulaDetails(id),
    staleTime: 900_000,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useIngredients() {
  return useQuery<Ingredient[]>({
    queryKey: labKeys.ingredients(),
    queryFn: () => getIngredients(),
    staleTime: 900_000,
  });
}
