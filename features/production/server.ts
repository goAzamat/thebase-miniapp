'use server';
/**
 * features/production/server.ts
 * -------------------------------------------------------------
 * Production Server Action. Returns the seed batch corpus, overlaid with LIVE
 * mrp.production headers (status + produced qty) matched by origin ↔ SO id.
 * Silent fallback to seed if Odoo is unreachable / lacks Manufacturing access.
 */
import { buildProduction, mapMrpState, type ProductionData } from './schema';
import { fetchMrpProductions } from './odoo-mrp';
import { isCreditLocked } from '@/features/finance/schema';

export async function getProductionData(): Promise<ProductionData> {
  const base = buildProduction();

  try {
    const live = await fetchMrpProductions();
    if (live.length === 0) return base;

    // Index live runs by their source document (origin === SO id) and by MO ref.
    const byOrigin = new Map(live.filter((l) => l.origin).map((l) => [l.origin, l]));
    const byRef = new Map(live.map((l) => [l.name, l]));

    const batches = base.batches.map((b) => {
      const m = byOrigin.get(b.salesOrderId) ?? byRef.get(b.id);
      if (!m) return b;
      return {
        ...b,
        status: mapMrpState(m.state),
        actualYieldUnits: Math.round(m.qtyProduced) || b.actualYieldUnits,
        live: true,
      };
    });

    return { batches };
  } catch {
    return base; // Odoo down / ACL → never crash the floor monitor
  }
}

export type BatchStartResult =
  | { success: true; batchId: string; status: 'mixing' }
  | { success: false; error: 'CREDIT_LOCK_VIOLATION'; client: string };

/**
 * Initialize a batch (Queued → Mixing). CROSS-MODULE GATE: if the buyer is
 * credit-locked (100+ days), abort before any Odoo state change.
 */
export async function startBatch(batchId: string): Promise<BatchStartResult> {
  const batch = buildProduction().batches.find((b) => b.id === batchId);
  const client = batch?.clientName ?? '';

  if (isCreditLocked(client)) {
    return { success: false, error: 'CREDIT_LOCK_VIOLATION', client };
  }

  // TODO(odoo): mrp.production button_plan / write state → 'progress'.
  return { success: true, batchId, status: 'mixing' };
}
