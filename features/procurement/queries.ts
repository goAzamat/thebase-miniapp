/**
 * features/procurement/queries.ts
 * -------------------------------------------------------------
 * React Query hooks for the Procurement Control Center, with optimistic
 * mutations for Purchase Requisitions and RFQ status transitions.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProcurement, createPurchaseRequisition, advanceRfqStatus } from './server';
import type { ProcurementData, PurchaseRequisition, RFQStatus } from './schema';

export const procurementKeys = {
  all: ['procurement'] as const,
  data: () => [...procurementKeys.all, 'data'] as const,
};

export function useProcurement() {
  return useQuery<ProcurementData>({
    queryKey: procurementKeys.data(),
    queryFn: () => getProcurement(),
    staleTime: 60_000,
  });
}

/** Create a Purchase Requisition; optimistically prepend it to the cache. */
export function useCreatePR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { ingredientName: string; requestedQtyKg: number; sku?: string }) =>
      createPurchaseRequisition(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: procurementKeys.data() });
      const prev = qc.getQueryData<ProcurementData>(procurementKeys.data());
      const tempId = `tmp-${Date.now()}`;
      const temp: PurchaseRequisition = {
        id: tempId,
        ingredientName: input.ingredientName,
        requestedQtyKg: input.requestedQtyKg,
        status: 'pending_approval',
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<ProcurementData>(procurementKeys.data(), (old) =>
        old ? { ...old, requisitions: [temp, ...old.requisitions] } : old,
      );
      return { prev, tempId };
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(procurementKeys.data(), ctx.prev);
    },
    onSuccess: (pr, _input, ctx) => {
      // Replace the temp record with the server-issued one.
      qc.setQueryData<ProcurementData>(procurementKeys.data(), (old) =>
        old
          ? { ...old, requisitions: old.requisitions.map((r) => (r.id === ctx?.tempId ? pr : r)) }
          : old,
      );
    },
  });
}

/** Advance an RFQ (sent → received / rejected); optimistic. */
export function useAdvanceRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: RFQStatus }) => advanceRfqStatus(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: procurementKeys.data() });
      const prev = qc.getQueryData<ProcurementData>(procurementKeys.data());
      qc.setQueryData<ProcurementData>(procurementKeys.data(), (old) =>
        old
          ? { ...old, rfqs: old.rfqs.map((r) => (r.id === input.id ? { ...r, status: input.status } : r)) }
          : old,
      );
      return { prev };
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(procurementKeys.data(), ctx.prev);
    },
  });
}
