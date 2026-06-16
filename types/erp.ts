/**
 * types/erp.ts
 * -------------------------------------------------------------
 * Unified Enterprise Data Types — the canonical contract that connects every
 * pillar of "The Base OS" (Lab ↔ Sales ↔ Supply Chain ↔ Production ↔ Finance
 * ↔ HR ↔ Admin). All cross-module logic and mock services are typed against
 * these interfaces, so the eventual Odoo bindings drop in behind one shape.
 */

export type FactoryId = 'dubai' | 'ajman' | 'malaysia';
export type BatchStatus = 'mixing' | 'bottling' | 'qc' | 'ready';
export type DealStage = 'new' | 'qualified' | 'proposition' | 'won';

/* ----------------------------- Lab / R&D ----------------------------- */

export interface BomLine {
  sku: string;
  name: string;
  type: string; // raw-material sub-category, e.g. "Flavour"
  doseG: number; // baseline dosage per batch (grams)
  costPerKg: number; // base cost per kg
}

export interface FormulaBOM {
  id: number; // product.template id
  sku: string;
  name: string;
  lines: BomLine[];
  baseCost: number; // computed cost per batch (AED)
  totalWeight: number; // grams per batch
  scaleYield: number; // expected yield factor (e.g. 0.98)
}

/* ------------------------------- Sales ------------------------------- */

export interface SalesOpportunity {
  id: number;
  clientName: string;
  stage: DealStage;
  revenue: number; // expected revenue (AED)
  probability: number; // 0–100
  targetFormulaSKU: string; // links to FormulaBOM.sku
  requiredVolumeUnits: number; // ordered units (batches)
}

/* ----------------------------- Production ---------------------------- */

export interface ProductionBatch {
  id: string;
  orderId: string; // links to SalesOpportunity / SO
  factoryId: FactoryId;
  formulaSKU: string; // links to FormulaBOM.sku
  batchStatus: BatchStatus;
  plannedKg: number;
  actualKg: number;
  yieldVariance: number; // % (actual vs planned baseline)
  startedAt: string; // ISO
}

/* --------------------------- Supply Chain ---------------------------- */

export interface FactoryCapacity {
  id: FactoryId;
  name: string;
  currentLoadPercentage: number; // 0–100
  maxCapacityTonsPerMonth: number;
  operational: boolean; // false while commissioning
}

/* ------------------------------ Finance ------------------------------ */

export interface FinancialSnapshot {
  revenueMTD: number;
  cashInBank: number;
  receivables: number;
  payables: number;
  ebitdaMarginPct: number;
  runwayMonths: number;
}

/* -------------------------------- HR --------------------------------- */

export interface HeadcountUnit {
  dept: string;
  headcount: number;
  utilizationPct: number;
  openRoles: number;
}

export interface FactoryFloorAllocation {
  factoryId: FactoryId;
  factoryName: string;
  operators: number;
  shifts: number;
  coveragePct: number;
}

export interface HrMetrics {
  totalHeadcount: number;
  avgUtilizationPct: number;
  openRoles: number;
  units: HeadcountUnit[];
  floor: FactoryFloorAllocation[];
}

/* ------------------------------- Admin ------------------------------- */

export type ConnectionStatus = 'connected' | 'degraded' | 'error';

export interface OdooConnectionStatus {
  model: string;
  status: ConnectionStatus;
  lastSyncIso: string;
  recordCount: number;
}

export interface IntegrationLogEntry {
  ts: string; // ISO
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
}

export interface AdminIntegration {
  connections: OdooConnectionStatus[];
  logs: IntegrationLogEntry[];
}

/* ----------------------- Cross-module aggregate ---------------------- */

export interface PerFactoryProjection {
  factoryId: FactoryId;
  name: string;
  loadPct: number;
  freeTons: number;
}

export interface PipelineMetrics {
  weightedRevenue: number;
  projectedVolumeTons: number; // whole pipeline
  committedVolumeTons: number; // Proposition + Won
  capacityTons: number; // total operational capacity
  freeCapacityTons: number;
  runwayPct: number; // committed / capacity
  perFactory: PerFactoryProjection[];
}
