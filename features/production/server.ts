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
import { operatorForBatch, healthForEmployee, isHealthCritical } from '@/features/hr/schema';

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
  | { success: false; error: 'CREDIT_LOCK_VIOLATION'; client: string }
  | { success: false; error: 'HACCP_COMPLIANCE_VIOLATION'; operatorName: string };

/**
 * Initialize a batch (Queued → Mixing). DOUBLE-GATED before any Odoo state
 * change:
 *   Gate 1 — Finance: buyer must not be credit-locked (100+ days).
 *   Gate 2 — HR/HACCP: the assigned operator's sanitary card must be valid
 *            (not expired and ≥ 7 days to renewal).
 */
export async function startBatch(batchId: string): Promise<BatchStartResult> {
  const batch = buildProduction().batches.find((b) => b.id === batchId);
  const client = batch?.clientName ?? '';

  // Gate 1 — credit compliance.
  if (isCreditLocked(client)) {
    return { success: false, error: 'CREDIT_LOCK_VIOLATION', client };
  }

  // Gate 2 — HACCP sanitary clearance of the assigned operator.
  const operator = operatorForBatch(batchId);
  if (operator) {
    const health = healthForEmployee(operator.name);
    if (health && isHealthCritical(health)) {
      return { success: false, error: 'HACCP_COMPLIANCE_VIOLATION', operatorName: operator.name };
    }
  }

  // TODO(odoo): mrp.production button_plan / write state → 'progress'.
  return { success: true, batchId, status: 'mixing' };
}
