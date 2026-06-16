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
export type OrderClass = 'b2b' | 'b2c' | 'rush';
export type RndStatus = 'unparsed' | 'parsing' | 'calculated' | 'quoted';

/** Shipment document package compliance (audit: paperwork delays). */
export interface DocStatus {
  inv: boolean; // Invoice
  pkl: boolean; // Packing List
  hc: boolean; // Health Certificate validated
  hcSlaDaysLeft: number; // 3-day SLA countdown (0 = overdue)
  coo: boolean; // Certificate of Origin
}

/** WhatsApp → Odoo raw intake item (audit: paper-on-the-wall problem). */
export interface IntakeItem {
  id: string;
  ts: string; // ISO
  sender: string;
  snippet: string;
  rndStatus: RndStatus;
  phone?: string; // E.164-ish, used for Odoo res.partner matching
  leadId?: number; // crm.lead id once ingested
}

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
  documents: DocStatus; // fulfillment doc tracker
  orderClass: OrderClass; // B2B / B2C / Rush
  leadTimeBufferDays: number; // delivery window vs real-time capacity
}

export interface SalesKpis {
  weightedForecast: number;
  projectedVolumeTons: number;
  committedVolumeTons: number; // Proposition + Won
  capacityTons: number;
  runwayPct: number; // committed / capacity
  // Operational risk counters
  docBottlenecks: number; // orders with an incomplete document package
  activeRushOrders: number; // escalated rush orders disrupting the schedule
  whatsappBacklog: number; // unparsed WhatsApp intake requests
}

export interface SalesIntel {
  kpis: SalesKpis;
  deals: SalesDeal[];
  intake: IntakeItem[]; // DMS Intake Queue
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

/** WhatsApp → Odoo digital intake (DMS) — raw incoming leads + R&D status. */
export const INTAKE_QUEUE: IntakeItem[] = [
  { id: 'wa-9001', ts: '2026-06-17T09:14:00Z', sender: '+966 50 •• Barn’s', snippet: 'Need 2 ton matcha base, same as last PO + halal cert', rndStatus: 'unparsed' },
  { id: 'wa-9002', ts: '2026-06-17T08:52:00Z', sender: '+971 55 •• Bidfood', snippet: 'Karak masala 1.5t — pls quote landed Dubai', rndStatus: 'unparsed' },
  { id: 'wa-9003', ts: '2026-06-17T08:31:00Z', sender: '+7 939 •• Coffee Like', snippet: 'Chocolate classic reorder, add no-sugar variant?', rndStatus: 'parsing' },
  { id: 'wa-9004', ts: '2026-06-17T07:58:00Z', sender: '+965 6 •• Caribou', snippet: 'Functional matcha w/ protein — feasibility + cost', rndStatus: 'calculated' },
  { id: 'wa-9005', ts: '2026-06-16T18:40:00Z', sender: '+962 7 •• Tree of Life', snippet: 'Iced tea peach 600kg, target ≤ 1.4 AED/serving', rndStatus: 'quoted' },
  { id: 'wa-9006', ts: '2026-06-16T17:05:00Z', sender: '+971 52 •• Espresso Lab', snippet: 'Raf cola sample request for tasting next week', rndStatus: 'unparsed' },
];

function docStatusFor(seed: number): DocStatus {
  const inv = seed % 5 !== 0;
  const pkl = (seed >> 1) % 4 !== 0;
  const coo = (seed >> 2) % 3 !== 0;
  const hc = (seed >> 3) % 2 === 0;
  return { inv, pkl, hc, hcSlaDaysLeft: hc ? 3 : seed % 4, coo };
}

function orderClassFor(seed: number): OrderClass {
  if (seed % 6 === 0) return 'rush';
  if (seed % 3 === 0) return 'b2c';
  return 'b2b';
}

/**
 * Predictive Demand + Operational Risk engine — enriches CRM leads with recipe
 * context, projected volume, supply feasibility, recommended OEM plant, the
 * fulfillment document tracker, order classification and a capacity-aware lead
 * time buffer, then rolls up S&OP + operational-risk KPIs and the DMS queue.
 */
export function buildSalesIntel(leads: Lead[], factories: FactoryLoad[]): SalesIntel {
  const operational = [...factories.filter((f) => f.operational)].sort((a, b) => a.loadPct - b.loadPct);
  const bestPlant = operational[0]?.name ?? 'TBD';
  const bestLoad = operational[0]?.loadPct ?? 50;

  let weightedForecast = 0;
  let projectedKg = 0;
  let committedKg = 0;
  let docBottlenecks = 0;
  let activeRushOrders = 0;

  const deals: SalesDeal[] = leads.map((l) => {
    const h = hashString(`${l.id}:${l.name}`);
    const recipe = RECIPE_POOL[h % RECIPE_POOL.length];
    const volumeKg = l.revenue > 0 ? l.revenue / ASSUMED_AED_PER_KG : 0;
    const weighted = l.revenue * (l.probability / 100);
    const stageKey = stageKeyOf(l.stage);
    const feasibility: 'secured' | 'deficit' = h % 3 === 0 ? 'deficit' : 'secured';
    const documents = docStatusFor(h);
    const orderClass = orderClassFor(h);
    const leadTimeBufferDays = 5 + Math.round(bestLoad / 10) + (orderClass === 'rush' ? 1 : 0);

    weightedForecast += weighted;
    projectedKg += volumeKg;
    if (stageKey === 'won' || stageKey === 'proposition') committedKg += volumeKg;
    if (!(documents.inv && documents.pkl && documents.hc && documents.coo)) docBottlenecks += 1;
    if (orderClass === 'rush') activeRushOrders += 1;

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
      documents,
      orderClass,
      leadTimeBufferDays,
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
      docBottlenecks,
      activeRushOrders,
      whatsappBacklog: INTAKE_QUEUE.filter((i) => i.rndStatus === 'unparsed').length,
    },
    deals,
    intake: INTAKE_QUEUE,
  };
}
