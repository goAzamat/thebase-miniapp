'use server';
/**
 * features/admin/server.ts
 * -------------------------------------------------------------
 * Module 7 — Integration Console & Governance Admin server actions.
 *
 * Reads the LIVE idempotency ledger (server-only) and re-shapes it into the
 * PURE `LedgerRow` so the client never imports the server-only ledger type.
 * Diagnostics re-ping the data pipelines; the gate toggles mutate the
 * server-only override store in flags.ts.
 */
import { getLedger, ledgerStats } from '@/features/sales/idempotency';
import { getGates, setGate } from './flags';
import {
  pingServices,
  demoLedger,
  type AdminConsoleData,
  type ApiStatus,
  type GateConfig,
  type GateId,
  type LedgerRow,
  type LedgerStats,
} from './schema';

const tick = () => new Promise<void>((r) => setTimeout(r, 90));

/** Map the server-only ledger entries → pure rows; fall back to demo if empty. */
function readLedger(): { ledger: LedgerRow[]; stats: LedgerStats } {
  const live = getLedger(50);
  if (live.length === 0) {
    const demo = demoLedger();
    const stats: LedgerStats = { pending: 0, processed: 0, failed: 0 };
    for (const r of demo) stats[r.status] += 1;
    return { ledger: demo, stats };
  }
  const ledger: LedgerRow[] = live.map((e) => ({
    messageId: e.messageId,
    status: e.status,
    receivedAt: e.receivedAt,
    processedAt: e.processedAt,
    error: e.error,
  }));
  return { ledger, stats: ledgerStats() };
}

/** Full console payload: ping board + audit ledger + governance gates. */
export async function getAdminConsole(): Promise<AdminConsoleData> {
  await tick();
  const { ledger, stats } = readLedger();
  return {
    apis: pingServices(),
    ledger,
    ledgerStats: stats,
    gates: getGates(),
  };
}

/** "Run Diagnostic Check" — re-ping every pipeline and return fresh statuses. */
export async function runDiagnostic(): Promise<ApiStatus[]> {
  await tick();
  return pingServices();
}

/** Master override switch — toggle a cross-module enforcement gate. */
export async function toggleGate(id: GateId, enabled: boolean): Promise<GateConfig[]> {
  return setGate(id, enabled);
}
