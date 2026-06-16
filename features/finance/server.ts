'use server';
/**
 * features/finance/server.ts
 * -------------------------------------------------------------
 * Finance Control Tower Server Action. Mock-backed; the seam for the future
 * Odoo binding (account.move / account.move.line aging, project.project).
 */
import { buildFinanceControl, isCreditLocked, type FinanceControlData } from './schema';
import { gateEnabled } from '@/features/admin/flags';

const tick = () => new Promise<void>((r) => setTimeout(r, 100));

export async function getFinanceControl(): Promise<FinanceControlData> {
  await tick();
  return buildFinanceControl();
}

/**
 * Internal compliance gate exposed as a Server Action. Returns true if the
 * client has any balance in the 100+ days bucket. Used by Procurement &
 * Production server actions before any Odoo write. Honors the admin master
 * override: if the `credit_lock` governance gate is disabled, the lock is
 * bypassed (returns false) regardless of the client's aging balance.
 */
export async function isClientCreditLocked(clientName: string): Promise<boolean> {
  if (!gateEnabled('credit_lock')) return false;
  return isCreditLocked(clientName);
}
