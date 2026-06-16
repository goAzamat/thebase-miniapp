/**
 * features/admin/queries.ts
 * -------------------------------------------------------------
 * React Query hooks + key factory for Module 7 (Integration Console).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminConsole, runDiagnostic, toggleGate } from './server';
import type { AdminConsoleData, ApiStatus, GateConfig, GateId } from './schema';

export const adminConsoleKeys = {
  all: ['admin-console'] as const,
  data: () => [...adminConsoleKeys.all, 'data'] as const,
};

export function useAdminConsole() {
  return useQuery<AdminConsoleData>({
    queryKey: adminConsoleKeys.data(),
    queryFn: () => getAdminConsole(),
    staleTime: 20_000,
  });
}

/** Run Diagnostic Check → re-ping pipelines and patch the live status grid. */
export function useRunDiagnostic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<ApiStatus[]> => runDiagnostic(),
    onSuccess: (apis) => {
      qc.setQueryData<AdminConsoleData>(adminConsoleKeys.data(), (old) =>
        old ? { ...old, apis } : old,
      );
    },
  });
}

/** Master override toggle. Optimistic flip with rollback on error. */
export function useToggleGate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: GateId; enabled: boolean }): Promise<GateConfig[]> =>
      toggleGate(v.id, v.enabled),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: adminConsoleKeys.data() });
      const prev = qc.getQueryData<AdminConsoleData>(adminConsoleKeys.data());
      qc.setQueryData<AdminConsoleData>(adminConsoleKeys.data(), (old) =>
        old
          ? { ...old, gates: old.gates.map((g) => (g.id === v.id ? { ...g, isEnabled: v.enabled } : g)) }
          : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(adminConsoleKeys.data(), ctx.prev);
    },
    onSuccess: (gates) => {
      qc.setQueryData<AdminConsoleData>(adminConsoleKeys.data(), (old) =>
        old ? { ...old, gates } : old,
      );
    },
  });
}
