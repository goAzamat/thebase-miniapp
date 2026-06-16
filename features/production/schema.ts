/**
 * features/production/schema.ts
 * -------------------------------------------------------------
 * Manufacturing Operations & QA — types, mock corpus and pure helpers.
 * Maps onto Odoo `mrp.production` (batch headers) and, later, the raw-move
 * consumption (`stock.move` of `move_raw_ids`) vs the `mrp.bom` baseline for
 * the yield-variance matrix.
 */

export type ProductionStatus = 'queued' | 'mixing' | 'bottling' | 'qa_check' | 'ready';
export type FacilityId = 'dubai' | 'ajman';

export const PRODUCTION_STAGES: ProductionStatus[] = ['queued', 'mixing', 'bottling', 'qa_check', 'ready'];

/** Variance beyond +3% over-consumption is a material loss → critical alert. */
export const VARIANCE_LOSS_THRESHOLD = 3;

export interface YieldVariance {
  ingredientName: string;
  theoreticalQtyKg: number; // R&D Lab formula baseline
  actualQtyKg: number; // factory-floor consumption (Odoo)
  variancePercentage: number; // (actual − theoretical) / theoretical
  costImpactAed: number; // (actual − theoretical) × price/kg
}

export interface ProductionBatch {
  id: string;
  salesOrderId: string;
  clientName: string; // buyer — used by the credit-lock gate
  formulaSku: string;
  formulaName: string;
  targetYieldUnits: number;
  actualYieldUnits: number;
  status: ProductionStatus;
  facilityId: string; // 'dubai' | 'ajman'
  startedAt: string; // ISO
  qaCleared: boolean; // micro-biological clearance
  variance: YieldVariance[];
  live?: boolean; // header overlaid from Odoo mrp.production
}

export interface ProductionData {
  batches: ProductionBatch[];
}

/* ------------------------------ helpers ------------------------------ */

export function computeVariance(
  theoreticalQtyKg: number,
  actualQtyKg: number,
  pricePerKg: number,
): { variancePercentage: number; costImpactAed: number } {
  const pct = theoreticalQtyKg > 0 ? ((actualQtyKg - theoreticalQtyKg) / theoreticalQtyKg) * 100 : 0;
  const cost = (actualQtyKg - theoreticalQtyKg) * pricePerKg;
  return {
    variancePercentage: Math.round(pct * 10) / 10,
    costImpactAed: Math.round(cost * 100) / 100,
  };
}

/** Total monetary loss of a batch (over-consumption lines only). */
export function batchLossAed(b: ProductionBatch): number {
  return Math.round(
    b.variance.filter((v) => v.variancePercentage > 0).reduce((s, v) => s + v.costImpactAed, 0) * 100,
  ) / 100;
}

/** Map an Odoo mrp.production state to our stage. */
export function mapMrpState(state: string): ProductionStatus {
  switch (state) {
    case 'progress':
      return 'mixing';
    case 'to_close':
      return 'qa_check';
    case 'done':
      return 'ready';
    case 'draft':
    case 'confirmed':
    default:
      return 'queued';
  }
}

/* ------------------------------- mock -------------------------------- */

// [ingredient, theoretical kg, actual kg, price/kg]
type VRow = [string, number, number, number];

function vlines(rows: VRow[]): YieldVariance[] {
  return rows.map(([ingredientName, theoreticalQtyKg, actualQtyKg, price]) => {
    const { variancePercentage, costImpactAed } = computeVariance(theoreticalQtyKg, actualQtyKg, price);
    return { ingredientName, theoreticalQtyKg, actualQtyKg, variancePercentage, costImpactAed };
  });
}

const SEED_BATCHES: ProductionBatch[] = [
  {
    id: 'MO-5521',
    salesOrderId: 'SO-24817',
    clientName: "Barn's Cafe",
    formulaSku: 'MT-002',
    formulaName: 'Matcha Classic',
    targetYieldUnits: 1800,
    actualYieldUnits: 1782,
    status: 'qa_check',
    facilityId: 'dubai',
    startedAt: '2026-06-15T07:30:00Z',
    qaCleared: false,
    variance: vlines([
      ['Matcha BHM568', 225, 231, 127.78],
      ['Extra Fine Sugar', 1080, 1092, 5.24],
      ['Non Dairy Creamer', 432, 450, 9.0],
      ['Silicon Dioxide', 31.5, 31.6, 14.5],
    ]),
  },
  {
    id: 'MO-5519',
    salesOrderId: 'SO-24805',
    clientName: 'Coffee Like',
    formulaSku: 'CC-002',
    formulaName: 'Chocolate Classic',
    targetYieldUnits: 1200,
    actualYieldUnits: 1212,
    status: 'ready',
    facilityId: 'dubai',
    startedAt: '2026-06-12T06:10:00Z',
    qaCleared: true,
    variance: vlines([
      ['Cocoa Powder Alkalized', 240, 243, 36.0],
      ['Extra Fine Sugar', 768, 770, 5.24],
      ['Non Dairy Creamer', 187, 188, 9.0],
    ]),
  },
  {
    id: 'MO-5526',
    salesOrderId: 'SO-24831',
    clientName: 'Zebra Coffee',
    formulaSku: 'MT-002',
    formulaName: 'Matcha Classic',
    targetYieldUnits: 900,
    actualYieldUnits: 0,
    status: 'queued',
    facilityId: 'dubai',
    startedAt: '2026-06-17T05:00:00Z',
    qaCleared: false,
    variance: [],
  },
  {
    id: 'MO-5522',
    salesOrderId: 'SO-24820',
    clientName: 'Half Million',
    formulaSku: 'CL-001',
    formulaName: 'Karak Chai',
    targetYieldUnits: 3000,
    actualYieldUnits: 1450,
    status: 'mixing',
    facilityId: 'ajman',
    startedAt: '2026-06-16T08:00:00Z',
    qaCleared: false,
    variance: vlines([
      ['Cardamom Seed Extract', 24, 26, 394.7],
      ['Extra Fine Sugar', 1080, 1086, 5.24],
    ]),
  },
  {
    id: 'MO-5524',
    salesOrderId: 'SO-24828',
    clientName: 'Bidfood UAE',
    formulaSku: 'IT-001',
    formulaName: 'Iced Tea Peach',
    targetYieldUnits: 2400,
    actualYieldUnits: 2360,
    status: 'bottling',
    facilityId: 'ajman',
    startedAt: '2026-06-16T09:20:00Z',
    qaCleared: false,
    variance: vlines([
      ['Instant Black Tea', 144, 152, 45.94],
      ['Peach Flavouring', 60, 64, 57.11],
      ['Citric Acid', 72, 73, 5.0],
    ]),
  },
  {
    id: 'MO-5527',
    salesOrderId: 'SO-24840',
    clientName: 'Tree of Life',
    formulaSku: 'CC-002',
    formulaName: 'Chocolate Classic',
    targetYieldUnits: 800,
    actualYieldUnits: 812,
    status: 'ready',
    facilityId: 'ajman',
    startedAt: '2026-06-14T07:00:00Z',
    qaCleared: false,
    variance: vlines([
      ['Cocoa Powder Alkalized', 160, 168, 36.0],
      ['Extra Fine Sugar', 512, 515, 5.24],
    ]),
  },
];

export function buildProduction(): ProductionData {
  return { batches: SEED_BATCHES };
}
