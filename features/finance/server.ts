'use server';
/**
 * features/finance/server.ts
 * -------------------------------------------------------------
 * Finance Control Tower Server Action. Mock-backed; the seam for the future
 * Odoo binding (account.move / account.move.line aging, project.project).
 */
import { buildFinanceControl, isCreditLocked, type FinanceControlData } from './schema';

const tick = () => new Promise<void>((r) => setTimeout(r, 100));

export async function getFinanceControl(): Promise<FinanceControlData> {
  await tick();
  return buildFinanceControl();
}

/**
 * Internal compliance gate exposed as a Server Action. Returns true if the
 * client has any balance in the 100+ days bucket. Used by Procurement &
 * Production server actions before any Odoo write.
 */
export async function isClientCreditLocked(clientName: string): Promise<boolean> {
  return isCreditLocked(clientName);
}
