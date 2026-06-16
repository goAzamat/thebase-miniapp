/**
 * features/production/queries.ts
 * -------------------------------------------------------------
 * React Query hook + key factory for the Manufacturing module.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProductionData, startBatch } from './server';
import type { ProductionData } from './schema';

export const productionKeys = {
  all: ['production'] as const,
  data: () => [...productionKeys.all, 'data'] as const,
};

export function useProductionData() {
  return useQuery<ProductionData>({
    queryKey: productionKeys.data(),
    queryFn: () => getProductionData(),
    staleTime: 30_000,
  });
}

/** Start a batch (Queued → Mixing); blocked by the credit gate. Optimistic. */
export function useStartBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (batch: { id: string }) => {
      const r = await startBatch(batch.id);
      if (!r.success) {
        throw Object.assign(new Error('CREDIT_LOCK_VIOLATION'), {
          code: 'CREDIT_LOCK_VIOLATION',
          client: r.client,
        });
      }
      return r;
    },
    onMutate: async (batch: { id: string }) => {
      await qc.cancelQueries({ queryKey: productionKeys.data() });
      const prev = qc.getQueryData<ProductionData>(productionKeys.data());
      qc.setQueryData<ProductionData>(productionKeys.data(), (old) =>
        old
          ? { ...old, batches: old.batches.map((b) => (b.id === batch.id ? { ...b, status: 'mixing' as const } : b)) }
          : old,
      );
      return { prev };
    },
    onError: (_e, _b, ctx) => {
      if (ctx?.prev) qc.setQueryData(productionKeys.data(), ctx.prev);
    },
  });
}
