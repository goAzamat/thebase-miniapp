/**
 * features/sales/queries.ts
 * -------------------------------------------------------------
 * React Query hook + key factory for the Sales module.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getActiveLeads, getSalesIntel, getIntakeQueue, markIntakeParsing } from './server';
import type { Lead, SalesIntel, IntakeItem } from './schema';

export const salesKeys = {
  all: ['sales'] as const,
  leads: () => [...salesKeys.all, 'leads'] as const,
  intel: () => [...salesKeys.all, 'intel'] as const,
  intakeQueue: () => [...salesKeys.all, 'intakeQueue'] as const,
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

/** Live DMS Intake Queue (WhatsApp → Odoo). */
export function useIntakeQueue() {
  return useQuery<IntakeItem[]>({
    queryKey: salesKeys.intakeQueue(),
    queryFn: () => getIntakeQueue(),
    staleTime: 30_000,
  });
}

/** Optimistically shift an intake item Unparsed → Parsing. */
export function useMarkIntakeParsing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: IntakeItem) => markIntakeParsing(item.leadId ?? 0),
    onMutate: async (item: IntakeItem) => {
      await qc.cancelQueries({ queryKey: salesKeys.intakeQueue() });
      const prev = qc.getQueryData<IntakeItem[]>(salesKeys.intakeQueue());
      qc.setQueryData<IntakeItem[]>(salesKeys.intakeQueue(), (old) =>
        old?.map((i) => (i.id === item.id ? { ...i, rndStatus: 'parsing' } : i)),
      );
      return { prev };
    },
    onError: (_e, _item, ctx) => {
      if (ctx?.prev) qc.setQueryData(salesKeys.intakeQueue(), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: salesKeys.intakeQueue() }),
  });
}
