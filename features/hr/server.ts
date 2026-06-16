'use server';
/**
 * features/hr/server.ts
 * -------------------------------------------------------------
 * Labor Operations Server Action. Mock-backed; seam for the Odoo binding
 * (hr.employee, mrp.workorder OEE, sanitary-card custom field).
 */
import { buildHrLabor, type HrLaborData } from './schema';

const tick = () => new Promise<void>((r) => setTimeout(r, 100));

export async function getHrLabor(): Promise<HrLaborData> {
  await tick();
  return buildHrLabor();
}
