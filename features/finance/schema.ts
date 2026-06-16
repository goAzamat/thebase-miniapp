/**
 * features/finance/schema.ts
 * -------------------------------------------------------------
 * Finance Control Tower & Cost Leakage Auditor — types + mock corpus.
 * Codifies the operational losses (COPQ), AR credit risk and project
 * governance gaps from the corporate audit. Maps onto Odoo account.move /
 * account.move.line for a future live binding.
 */
import type { FinancialSnapshot } from '@/types/erp';

/* ------------------------- Cost of Poor Quality ---------------------- */

export interface CostOfLosses {
  cancelledOrdersCostAed: number; // sunk capital on orders cancelled post-production
  deadStockHoldingCostAed: number; // finished goods sitting without a buyer
  rushPurchasePremiumAed: number; // premium on emergency rush procurement
  copqScrapAed: number; // scrap / rework
  sugarContaminationLossAed: number; // Sugar Contamination Incident recovery
  copqPercentageOfRevenue: number; // COPQ as % of revenue (baseline metric)
}

/* --------------------------- AR credit risk -------------------------- */

export type AgingBucketKey = 'current' | 'd31_60' | 'd61_90' | 'd100plus';

export interface ReceivableAgingBucket {
  key: AgingBucketKey;
  amountAed: number;
  clients: string[];
  locked: boolean; // 100+ days → credit lock
}

export interface InvoiceLedger {
  id: string;
  client: string;
  amountAed: number;
  dueDate: string; // ISO
  daysOverdue: number;
  bucket: AgingBucketKey;
}

/* --------------------------- Project charter ------------------------- */

export type ProjectStatus = 'on_track' | 'at_risk' | 'blocked';

export interface CorporateProject {
  id: string;
  name: string;
  owner: string;
  milestoneDate: string; // ISO
  status: ProjectStatus;
  budgetAed: number;
  successKpi: string;
}

/* ----------------------------- Aggregate ----------------------------- */

export interface FinanceControlData {
  snapshot: FinancialSnapshot;
  losses: CostOfLosses;
  aging: ReceivableAgingBucket[];
  invoices: InvoiceLedger[];
  projects: CorporateProject[];
  systemLock: boolean; // any client in 100+ days
  lockedClients: string[];
  governanceKpiPct: number; // % initiatives with named owner + milestone
}

/** Sum of the discrete COPQ leak line items (AED). */
export function totalCopqAed(l: CostOfLosses): number {
  return (
    l.cancelledOrdersCostAed +
    l.deadStockHoldingCostAed +
    l.rushPurchasePremiumAed +
    l.copqScrapAed +
    l.sugarContaminationLossAed
  );
}

/* ------------------------------- mock -------------------------------- */

const SNAPSHOT: FinancialSnapshot = {
  revenueMTD: 430_000,
  cashInBank: 2_150_000,
  receivables: 1_841_000,
  payables: 640_000,
  ebitdaMarginPct: 49.7,
  runwayMonths: 14,
};

const LOSSES: CostOfLosses = {
  cancelledOrdersCostAed: 92_400, // ~15% of a production run sunk
  deadStockHoldingCostAed: 58_300,
  rushPurchasePremiumAed: 21_750,
  copqScrapAed: 34_900,
  sugarContaminationLossAed: 47_000,
  copqPercentageOfRevenue: 6.8, // vs ≤3% target
};

const AGING: ReceivableAgingBucket[] = [
  { key: 'current', amountAed: 1_280_000, clients: ["Barn's Cafe", 'Half Million', 'Bidfood UAE'], locked: false },
  { key: 'd31_60', amountAed: 320_000, clients: ['Coffee Like', 'Tree of Life'], locked: false },
  { key: 'd61_90', amountAed: 145_000, clients: ['Caribou MENA'], locked: false },
  { key: 'd100plus', amountAed: 96_000, clients: ['Zebra Coffee'], locked: true },
];

const INVOICES: InvoiceLedger[] = [
  { id: 'INV/2026/0512', client: 'Zebra Coffee', amountAed: 96_000, dueDate: '2026-03-04', daysOverdue: 105, bucket: 'd100plus' },
  { id: 'INV/2026/0631', client: 'Caribou MENA', amountAed: 145_000, dueDate: '2026-04-08', daysOverdue: 70, bucket: 'd61_90' },
  { id: 'INV/2026/0702', client: 'Coffee Like', amountAed: 180_000, dueDate: '2026-05-02', daysOverdue: 46, bucket: 'd31_60' },
  { id: 'INV/2026/0810', client: "Barn's Cafe", amountAed: 540_000, dueDate: '2026-07-01', daysOverdue: 0, bucket: 'current' },
];

const PROJECTS: CorporateProject[] = [
  {
    id: 'PRJ-01',
    name: 'Odoo ERP Core Implementation',
    owner: 'Azamat Zhumagul (CEO)',
    milestoneDate: '2026-08-31',
    status: 'at_risk',
    budgetAed: 220_000,
    successKpi: 'All 7 modules live, 4800 POS synced',
  },
  {
    id: 'PRJ-02',
    name: 'Warehouse Reorganisation & Inventory Audit',
    owner: 'Gary · Supply Chain',
    milestoneDate: '2026-07-15',
    status: 'on_track',
    budgetAed: 65_000,
    successKpi: '100% SKU bin-mapped, cycle-count variance < 1%',
  },
  {
    id: 'PRJ-03',
    name: 'QC & Compliance Standards Deployment',
    owner: 'Chethana · R&D / Quality',
    milestoneDate: '2026-09-30',
    status: 'blocked',
    budgetAed: 110_000,
    successKpi: 'ISO 22000 + HACCP re-audit passed',
  },
];

export function buildFinanceControl(): FinanceControlData {
  const lockedBucket = AGING.find((b) => b.key === 'd100plus' && b.amountAed > 0);
  const lockedClients = lockedBucket ? lockedBucket.clients : [];
  const withGovernance = PROJECTS.filter((p) => p.owner.trim() && p.milestoneDate).length;
  return {
    snapshot: SNAPSHOT,
    losses: LOSSES,
    aging: AGING,
    invoices: INVOICES,
    projects: PROJECTS,
    systemLock: lockedClients.length > 0,
    lockedClients,
    governanceKpiPct: PROJECTS.length ? Math.round((withGovernance / PROJECTS.length) * 100) : 0,
  };
}

/* ------------------- Cross-module credit compliance ------------------ */

/** Canonical form so "Zebra Coffee" matches "Zebra Coffee KZ", etc. */
function normalizeClient(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Clients with any balance in the 100+ days bucket. */
export function getLockedClientNames(): string[] {
  return buildFinanceControl().lockedClients;
}

/**
 * Strict credit-compliance check (pure, synchronous) shared by the Procurement
 * and Production gates. Returns true when the client is past 100 days.
 */
export function isCreditLocked(clientName: string): boolean {
  if (!clientName) return false;
  const n = normalizeClient(clientName);
  return getLockedClientNames().some((locked) => {
    const ln = normalizeClient(locked);
    return ln.length > 0 && (n.includes(ln) || ln.includes(n));
  });
}
