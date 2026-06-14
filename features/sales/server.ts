'use server';
/**
 * features/sales/server.ts
 * -------------------------------------------------------------
 * Sales data access — a near-identical copy of features/lab/server.ts.
 * Same pattern: serviceSearchRead → unstable_cache (Tier A) → clean array.
 * Demonstrates that a new department reuses the entire Core untouched.
 */
import { unstable_cache } from 'next/cache';
import { serviceSearchRead } from '@/lib/odoo/auth';
import { mapLead, SALES_LEAD_FIELDS, type RawLead, type Lead } from './schema';

// Open opportunities only.
const LEADS_DOMAIN: unknown[] = [
  ['type', '=', 'opportunity'],
  ['active', '=', true],
];

const fetchLeadsCached = unstable_cache(
  async (): Promise<Lead[]> => {
    const rows = await serviceSearchRead<RawLead>('crm.lead', LEADS_DOMAIN, [...SALES_LEAD_FIELDS], {
      limit: 100,
      order: 'expected_revenue desc',
    });
    return rows.map(mapLead);
  },
  ['sales', 'leads'],
  { revalidate: 120, tags: ['odoo:crm.lead', 'sales:leads'] },
);

export async function getActiveLeads(): Promise<Lead[]> {
  return fetchLeadsCached();
}
