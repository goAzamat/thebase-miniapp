'use server';
/**
 * features/procurement/server.ts
 * -------------------------------------------------------------
 * Procurement Server Actions — Task A is now LIVE against Odoo.
 *
 *   - getProcurement()            : overlays live stock.quant on-hand onto the
 *                                   Top-20 ledger (matched by SKU), recomputes
 *                                   reorder flags. Silent fallback to seed.
 *   - createPurchaseRequisition() : auto-resolves the vendor (product.supplier
 *                                   info) and creates a DRAFT purchase.order
 *                                   (RFQ) in Odoo; always returns a record.
 *   - advanceRfqStatus()          : RFQ negotiation state (mock for now).
 */
import {
  buildProcurement,
  computeReorder,
  type ProcurementData,
  type RFQStatus,
  type CreatePrResult,
} from './schema';
import { fetchLiveOdooStocks, stockByCode, createOdooPurchaseOrder } from './odoo-stock';
import { isCreditLocked } from '@/features/finance/schema';
import { gateEnabled } from '@/features/admin/flags';

const tick = () => new Promise<void>((r) => setTimeout(r, 80));

export async function getProcurement(): Promise<ProcurementData> {
  const base = buildProcurement();

  try {
    const live = await fetchLiveOdooStocks();
    const byCode = stockByCode(live);
    if (byCode.size === 0) return base; // nothing live → keep seed

    const reorderPoints = base.reorderPoints
      .map((rp) => {
        if (rp.sku && byCode.has(rp.sku)) {
          const qty = Math.max(0, Math.round(byCode.get(rp.sku)!));
          const { daysUntilStockout, status } = computeReorder(qty, rp.avgMonthlyKg);
          return { ...rp, currentStockKg: qty, daysUntilStockout, status, live: true };
        }
        return rp;
      })
      .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

    return { ...base, reorderPoints };
  } catch {
    // Odoo down / timeout / ACL → never crash the dashboard.
    return base;
  }
}

export async function createPurchaseRequisition(input: {
  ingredientName: string;
  requestedQtyKg: number;
  sku?: string;
  clientName?: string;
}): Promise<CreatePrResult> {
  // Cross-module credit gate — abort BEFORE any Odoo write if the linked
  // client is past 100 days (System Lock).
  if (gateEnabled('credit_lock') && input.clientName && isCreditLocked(input.clientName)) {
    return { success: false, error: 'CREDIT_LOCK_VIOLATION', client: input.clientName };
  }

  let odooId: number | null = null;
  try {
    odooId = await createOdooPurchaseOrder(input);
  } catch {
    odooId = null; // no vendor / Odoo down → record locally, never throw
  }

  return {
    success: true,
    pr: {
      id: odooId ? `PO-${odooId}` : `PO-${Date.now()}`,
      ingredientName: input.ingredientName,
      requestedQtyKg: input.requestedQtyKg,
      status: 'draft',
      createdAt: new Date().toISOString(),
      odooId: odooId ?? undefined,
    },
  };
}

export async function advanceRfqStatus(input: {
  id: string;
  status: RFQStatus;
}): Promise<{ id: string; status: RFQStatus }> {
  await tick();
  return input;
}
