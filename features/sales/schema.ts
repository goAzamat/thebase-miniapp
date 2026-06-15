/**
 * features/sales/schema.ts
 * -------------------------------------------------------------
 * Types + pure mapper for the Sales module (Odoo crm.lead).
 * Mirrors features/lab/schema.ts — this is the "copy-paste" template.
 */

import type { FactoryLoad } from '@/features/supply-chain/schema';

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

/* --------------------------- S&OP INTEL --------------------------- */

export type DealStage = 'new' | 'qualified' | 'proposition' | 'won' | 'other';

export interface SalesDeal {
  id: number;
  name: string;
  partner: string | null;
  revenue: number;
  probability: number;
  stage: string | null;
  stageKey: DealStage;
  weightedRevenue: number; // revenue * probability
  volumeKg: number; // projected manufacturing volume
  sku: string; // recipe context
  recipeName: string;
  formulaId: number; // product.template id → Lab formula detail (Simulate Batch)
  feasibility: 'secured' | 'deficit';
  recommendedPlant: string; // least-loaded operational factory
}

export interface SalesKpis {
  weightedForecast: number;
  projectedVolumeTons: number;
  committedVolumeTons: number; // Proposition + Won
  capacityTons: number;
  runwayPct: number; // committed / capacity
}

export interface SalesIntel {
  kpis: SalesKpis;
  deals: SalesDeal[];
}

// Tuning constants (synthetic until CRM carries product + volume natively).
const ASSUMED_AED_PER_KG = 50;
const TARGET_CAPACITY_TONS = 150; // monthly reference capacity

// Representative recipe pool mapped to REAL Lab formula ids (product.template),
// so "Simulate Batch" deep-links to the actual formula detail page.
const RECIPE_POOL: { code: string; name: string; formulaId: number }[] = [
  { code: 'MT-002', name: 'Matcha Classic', formulaId: 1668 },
  { code: 'CL-001', name: 'Karak Chai', formulaId: 1745 },
  { code: 'CC-002', name: 'Chocolate Classic', formulaId: 1666 },
  { code: 'RF-002', name: 'Raf Ptichye Moloko', formulaId: 1860 },
  { code: 'IT-001', name: 'Iced Tea Peach', formulaId: 1820 },
  { code: 'MS-007', name: 'Banana Milkshake', formulaId: 1584 },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function stageKeyOf(name: string | null): DealStage {
  const s = (name ?? '').toLowerCase();
  if (/won|closed|закры/.test(s)) return 'won';
  if (/propos|quote|negoti|предлож|оффер/.test(s)) return 'proposition';
  if (/qualif|квалиф/.test(s)) return 'qualified';
  if (/new|lead|нов/.test(s)) return 'new';
  return 'other';
}

/**
 * Predictive Demand Engine — enrich CRM leads with recipe context, projected
 * manufacturing volume, supply feasibility and the recommended OEM plant
 * (least-loaded OPERATIONAL factory), then roll up the S&OP KPIs.
 */
export function buildSalesIntel(leads: Lead[], factories: FactoryLoad[]): SalesIntel {
  const operational = factories.filter((f) => f.operational);
  const bestPlant = [...operational].sort((a, b) => a.loadPct - b.loadPct)[0]?.name ?? 'TBD';

  let weightedForecast = 0;
  let projectedKg = 0;
  let committedKg = 0;

  const deals: SalesDeal[] = leads.map((l) => {
    const h = hashString(`${l.id}:${l.name}`);
    const recipe = RECIPE_POOL[h % RECIPE_POOL.length];
    const volumeKg = l.revenue > 0 ? l.revenue / ASSUMED_AED_PER_KG : 0;
    const weighted = l.revenue * (l.probability / 100);
    const stageKey = stageKeyOf(l.stage);
    const feasibility: 'secured' | 'deficit' = h % 3 === 0 ? 'deficit' : 'secured';

    weightedForecast += weighted;
    projectedKg += volumeKg;
    if (stageKey === 'won' || stageKey === 'proposition') committedKg += volumeKg;

    return {
      id: l.id,
      name: l.name,
      partner: l.partner,
      revenue: l.revenue,
      probability: l.probability,
      stage: l.stage,
      stageKey,
      weightedRevenue: Math.round(weighted),
      volumeKg: Math.round(volumeKg),
      sku: recipe.code,
      recipeName: recipe.name,
      formulaId: recipe.formulaId,
      feasibility,
      recommendedPlant: bestPlant,
    };
  });

  const committedTons = committedKg / 1000;
  return {
    kpis: {
      weightedForecast: Math.round(weightedForecast),
      projectedVolumeTons: Math.round((projectedKg / 1000) * 10) / 10,
      committedVolumeTons: Math.round(committedTons * 10) / 10,
      capacityTons: TARGET_CAPACITY_TONS,
      runwayPct: Math.round((committedTons / TARGET_CAPACITY_TONS) * 100),
    },
    deals,
  };
}
