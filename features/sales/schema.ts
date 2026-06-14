/**
 * features/sales/schema.ts
 * -------------------------------------------------------------
 * Types + pure mapper for the Sales module (Odoo crm.lead).
 * Mirrors features/lab/schema.ts — this is the "copy-paste" template.
 */

export interface RawLead {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  expected_revenue: number;
  probability: number;
  stage_id: [number, string] | false;
}

export interface Lead {
  id: number;
  name: string;
  partner: string | null;
  revenue: number;
  probability: number;
  stage: string | null;
}

export const SALES_LEAD_FIELDS = [
  'name',
  'partner_id',
  'expected_revenue',
  'probability',
  'stage_id',
] as const;

export function mapLead(r: RawLead): Lead {
  return {
    id: r.id,
    name: r.name,
    partner: r.partner_id ? r.partner_id[1] : null,
    revenue: r.expected_revenue ?? 0,
    probability: r.probability ?? 0,
    stage: r.stage_id ? r.stage_id[1] : null,
  };
}
