/**
 * features/shared/mock.ts
 * -------------------------------------------------------------
 * High-octane, INTERRELATED mock corporation — formulas, opportunities,
 * factory capacity, live production batches, finance, HR and integration
 * health. Pure module (no 'use server') so server actions and pure logic can
 * both import it. Every dataset is typed against @/types/erp.
 *
 * The SKUs, factory ids and order ids are shared across datasets so the
 * dashboards reference one another (Sales→Production→Supply→Finance).
 */
import type {
  FormulaBOM,
  SalesOpportunity,
  FactoryCapacity,
  ProductionBatch,
  FinancialSnapshot,
  HrMetrics,
  AdminIntegration,
  PipelineMetrics,
} from '@/types/erp';

/* ------------------------------ Formulas ----------------------------- */

export const MOCK_FORMULAS: FormulaBOM[] = [
  {
    id: 1668,
    sku: 'MT-002',
    name: 'Matcha Classic',
    totalWeight: 500,
    scaleYield: 0.98,
    baseCost: 17.84,
    lines: [
      { sku: 'EX-BHF-004', name: 'Matcha BHM568', type: 'Extract', doseG: 62.5, costPerKg: 127.78 },
      { sku: 'MI-WLQ-003', name: 'Extra Fine Sugar', type: 'Main', doseG: 300, costPerKg: 5.24 },
      { sku: 'MI-ATM-004', name: 'Non Dairy Creamer', type: 'Main', doseG: 120, costPerKg: 9.0 },
      { sku: 'AD-ATM-007', name: 'Silicon Dioxide', type: 'Additive', doseG: 17.5, costPerKg: 14.5 },
    ],
  },
  {
    id: 1745,
    sku: 'CL-001',
    name: 'Karak Chai',
    totalWeight: 500,
    scaleYield: 0.99,
    baseCost: 8.37,
    lines: [
      { sku: 'EX-BZK-005', name: 'Cardamom Extract', type: 'Extract', doseG: 8, costPerKg: 394.7 },
      { sku: 'MI-WLQ-003', name: 'Extra Fine Sugar', type: 'Main', doseG: 360, costPerKg: 5.24 },
      { sku: 'MI-ATM-004', name: 'Non Dairy Creamer', type: 'Main', doseG: 120, costPerKg: 9.0 },
      { sku: 'CL-CMC-008', name: 'Sunset Yellow', type: 'Colour', doseG: 0.3, costPerKg: 33.5 },
    ],
  },
  {
    id: 1666,
    sku: 'CC-002',
    name: 'Chocolate Classic',
    totalWeight: 500,
    scaleYield: 0.97,
    baseCost: 8.49,
    lines: [
      { sku: 'MI-GMT-010', name: 'Cocoa Powder Alkalized', type: 'Main', doseG: 100, costPerKg: 36.0 },
      { sku: 'MI-WLQ-003', name: 'Extra Fine Sugar', type: 'Main', doseG: 320, costPerKg: 5.24 },
      { sku: 'MI-ATM-004', name: 'Non Dairy Creamer', type: 'Main', doseG: 78, costPerKg: 9.0 },
    ],
  },
];

/* ---------------------------- Opportunities -------------------------- */

export const MOCK_OPPORTUNITIES: SalesOpportunity[] = [
  { id: 24817, clientName: "Barn's Cafe", stage: 'won', revenue: 1_340_000, probability: 100, targetFormulaSKU: 'MT-002', requiredVolumeUnits: 1800 },
  { id: 24820, clientName: 'Half Million', stage: 'proposition', revenue: 880_000, probability: 70, targetFormulaSKU: 'CL-001', requiredVolumeUnits: 3000 },
  { id: 24805, clientName: 'Coffee Like', stage: 'won', revenue: 540_000, probability: 100, targetFormulaSKU: 'CC-002', requiredVolumeUnits: 1200 },
  { id: 24831, clientName: 'Zebra Coffee', stage: 'qualified', revenue: 410_000, probability: 45, targetFormulaSKU: 'MT-002', requiredVolumeUnits: 900 },
  { id: 24828, clientName: 'Bidfood UAE', stage: 'proposition', revenue: 1_050_000, probability: 60, targetFormulaSKU: 'CL-001', requiredVolumeUnits: 2400 },
  { id: 24834, clientName: 'Tree of Life', stage: 'new', revenue: 220_000, probability: 20, targetFormulaSKU: 'CC-002', requiredVolumeUnits: 600 },
];

/* ----------------------------- Capacities ---------------------------- */

export const MOCK_CAPACITIES: FactoryCapacity[] = [
  { id: 'dubai', name: 'Dubai · Al Quoz', currentLoadPercentage: 78, maxCapacityTonsPerMonth: 120, operational: true },
  { id: 'ajman', name: 'Ajman Plant', currentLoadPercentage: 54, maxCapacityTonsPerMonth: 80, operational: true },
  { id: 'malaysia', name: 'Malaysia (commissioning)', currentLoadPercentage: 19, maxCapacityTonsPerMonth: 150, operational: false },
];

/* ------------------------- Production batches ------------------------ */

/** Yield variance = (actual − planned) / planned, as a signed percentage. */
export function computeYieldVariance(plannedKg: number, actualKg: number): number {
  if (plannedKg <= 0) return 0;
  return Math.round(((actualKg - plannedKg) / plannedKg) * 1000) / 10;
}

const rawBatches: Omit<ProductionBatch, 'yieldVariance'>[] = [
  { id: 'MO-5521', orderId: 'SO-24817', factoryId: 'dubai', formulaSKU: 'MT-002', batchStatus: 'qc', plannedKg: 900, actualKg: 882, startedAt: '2026-06-15' },
  { id: 'MO-5522', orderId: 'SO-24820', factoryId: 'ajman', formulaSKU: 'CL-001', batchStatus: 'mixing', plannedKg: 1500, actualKg: 1500, startedAt: '2026-06-16' },
  { id: 'MO-5519', orderId: 'SO-24805', factoryId: 'dubai', formulaSKU: 'CC-002', batchStatus: 'ready', plannedKg: 600, actualKg: 612, startedAt: '2026-06-12' },
  { id: 'MO-5524', orderId: 'SO-24828', factoryId: 'ajman', formulaSKU: 'CL-001', batchStatus: 'bottling', plannedKg: 1200, actualKg: 1164, startedAt: '2026-06-16' },
  { id: 'MO-5526', orderId: 'SO-24831', factoryId: 'dubai', formulaSKU: 'MT-002', batchStatus: 'mixing', plannedKg: 450, actualKg: 450, startedAt: '2026-06-17' },
];

export const MOCK_BATCHES: ProductionBatch[] = rawBatches.map((b) => ({
  ...b,
  yieldVariance: computeYieldVariance(b.plannedKg, b.actualKg),
}));

/* ------------------------------ Finance ------------------------------ */

export const MOCK_FINANCE: FinancialSnapshot = {
  revenueMTD: 430_000,
  cashInBank: 2_150_000,
  receivables: 1_280_000,
  payables: 640_000,
  ebitdaMarginPct: 49.7,
  runwayMonths: 14,
};

/* -------------------------------- HR --------------------------------- */

export const MOCK_HR: HrMetrics = {
  totalHeadcount: 142,
  avgUtilizationPct: 81,
  openRoles: 9,
  units: [
    { dept: 'Production', headcount: 68, utilizationPct: 88, openRoles: 4 },
    { dept: 'R&D / Lab', headcount: 14, utilizationPct: 76, openRoles: 2 },
    { dept: 'Sales', headcount: 22, utilizationPct: 79, openRoles: 2 },
    { dept: 'Supply Chain', headcount: 18, utilizationPct: 83, openRoles: 1 },
    { dept: 'Finance & Admin', headcount: 20, utilizationPct: 72, openRoles: 0 },
  ],
  floor: [
    { factoryId: 'dubai', factoryName: 'Dubai · Al Quoz', operators: 38, shifts: 3, coveragePct: 92 },
    { factoryId: 'ajman', factoryName: 'Ajman Plant', operators: 24, shifts: 2, coveragePct: 84 },
    { factoryId: 'malaysia', factoryName: 'Malaysia (commissioning)', operators: 6, shifts: 1, coveragePct: 31 },
  ],
};

/* ------------------------------- Admin ------------------------------- */

export const MOCK_ADMIN: AdminIntegration = {
  connections: [
    { model: 'crm.lead', status: 'connected', lastSyncIso: '2026-06-17T08:42:00Z', recordCount: 237 },
    { model: 'mrp.bom', status: 'connected', lastSyncIso: '2026-06-17T08:40:00Z', recordCount: 237 },
    { model: 'product.template', status: 'connected', lastSyncIso: '2026-06-17T08:41:00Z', recordCount: 1133 },
    { model: 'stock.picking', status: 'degraded', lastSyncIso: '2026-06-17T07:10:00Z', recordCount: 412 },
    { model: 'account.move', status: 'error', lastSyncIso: '2026-06-16T22:05:00Z', recordCount: 0 },
  ],
  logs: [
    { ts: '2026-06-17T08:42:11Z', level: 'info', source: 'odoo.sync', message: 'crm.lead delta synced (12 updated)' },
    { ts: '2026-06-17T08:40:03Z', level: 'info', source: 'cache', message: 'lab:formulas revalidated' },
    { ts: '2026-06-17T07:10:55Z', level: 'warn', source: 'odoo.sync', message: 'stock.picking slow response (3.2s)' },
    { ts: '2026-06-16T22:05:40Z', level: 'error', source: 'odoo.auth', message: 'account.move read denied — service ACL missing' },
  ],
};

/* ----------------- Cross-module Predictive Pipeline ------------------ */

/**
 * Sales ➔ Production & Supply Chain link. Aggregates opportunities, weights
 * revenue by probability, explodes ordered units into raw tonnage via the
 * FormulaBOM, and maps projected demand against free factory capacity.
 */
export function predictivePipelineMetrics(
  opps: SalesOpportunity[],
  formulas: FormulaBOM[],
  capacities: FactoryCapacity[],
): PipelineMetrics {
  const bySku = new Map(formulas.map((f) => [f.sku, f]));

  let weightedRevenue = 0;
  let projectedKg = 0;
  let committedKg = 0;

  for (const o of opps) {
    weightedRevenue += o.revenue * (o.probability / 100);
    const f = bySku.get(o.targetFormulaSKU);
    const unitKg = f ? f.totalWeight / 1000 : 0; // BOM explosion: units → kg
    const kg = o.requiredVolumeUnits * unitKg;
    projectedKg += kg;
    if (o.stage === 'proposition' || o.stage === 'won') committedKg += kg;
  }

  const operational = capacities.filter((c) => c.operational);
  const capacityTons = operational.reduce((s, c) => s + c.maxCapacityTonsPerMonth, 0);
  const freeCapacityTons = operational.reduce(
    (s, c) => s + c.maxCapacityTonsPerMonth * (1 - c.currentLoadPercentage / 100),
    0,
  );

  const committedTons = committedKg / 1000;

  return {
    weightedRevenue: Math.round(weightedRevenue),
    projectedVolumeTons: Math.round((projectedKg / 1000) * 10) / 10,
    committedVolumeTons: Math.round(committedTons * 10) / 10,
    capacityTons,
    freeCapacityTons: Math.round(freeCapacityTons * 10) / 10,
    runwayPct: capacityTons > 0 ? Math.round((committedTons / capacityTons) * 100) : 0,
    perFactory: operational.map((c) => ({
      factoryId: c.id,
      name: c.name,
      loadPct: c.currentLoadPercentage,
      freeTons: Math.round(c.maxCapacityTonsPerMonth * (1 - c.currentLoadPercentage / 100) * 10) / 10,
    })),
  };
}
