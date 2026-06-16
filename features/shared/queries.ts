/**
 * features/shared/queries.ts
 * -------------------------------------------------------------
 * React Query hooks + key factory for the cross-module corporate datasets.
 */
import { useQuery } from '@tanstack/react-query';
import {
  getProductionBatches,
  getFinancialSnapshot,
  getHrMetrics,
  getAdminIntegration,
  getPipelineMetrics,
} from './server';
import type {
  ProductionBatch,
  FinancialSnapshot,
  HrMetrics,
  AdminIntegration,
  PipelineMetrics,
} from '@/types/erp';

export const sharedKeys = {
  production: () => ['production', 'batches'] as const,
  finance: () => ['finance', 'snapshot'] as const,
  hr: () => ['hr', 'metrics'] as const,
  admin: () => ['admin', 'integration'] as const,
  pipeline: () => ['shared', 'pipeline'] as const,
};

export function useProductionBatches() {
  return useQuery<ProductionBatch[]>({
    queryKey: sharedKeys.production(),
    queryFn: () => getProductionBatches(),
    staleTime: 60_000,
  });
}

export function useFinancialSnapshot() {
  return useQuery<FinancialSnapshot>({
    queryKey: sharedKeys.finance(),
    queryFn: () => getFinancialSnapshot(),
    staleTime: 60_000,
  });
}

export function useHrMetrics() {
  return useQuery<HrMetrics>({
    queryKey: sharedKeys.hr(),
    queryFn: () => getHrMetrics(),
    staleTime: 60_000,
  });
}

export function useAdminIntegration() {
  return useQuery<AdminIntegration>({
    queryKey: sharedKeys.admin(),
    queryFn: () => getAdminIntegration(),
    staleTime: 30_000,
  });
}

export function usePipelineMetrics() {
  return useQuery<PipelineMetrics>({
    queryKey: sharedKeys.pipeline(),
    queryFn: () => getPipelineMetrics(),
    staleTime: 60_000,
  });
}
