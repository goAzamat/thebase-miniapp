/**
 * features/hr/schema.ts
 * -------------------------------------------------------------
 * Labor Operations & Quality Compliance — types + mock corpus.
 * Tracks factory-floor operator efficiency (OEE), mandatory health/sanitary
 * compliance (HACCP gate) and R&D formulation velocity. Maps onto Odoo
 * hr.employee / mrp.workorder / a sanitary-card custom field later.
 */

export type AssignedStage = 'mixing' | 'bottling';
export type ShiftStatus = 'optimal' | 'underperforming';
export type SanitaryStatus = 'valid' | 'expiring' | 'expired';

export interface LaborShiftEfficiency {
  workerId: string;
  name: string;
  facilityId: string; // 'dubai' | 'ajman'
  assignedStage: AssignedStage;
  oeePercentage: number; // Overall Equipment Effectiveness
  activeBatchId: string; // links to a Production MO
  shiftStatus: ShiftStatus;
}

export interface HealthComplianceBadge {
  employeeName: string;
  role: string;
  sanitaryCardStatus: SanitaryStatus;
  daysToRenewal: number; // negative = expired N days ago
}

export interface RndVelocityMetric {
  chemistName: string;
  activeBriefsCount: number; // incoming WhatsApp briefs assigned
  avgFormulationTimeDays: number; // brief → calculated Odoo BOM spec
  executionRating: number; // 0–5
}

export interface HrLaborData {
  operators: LaborShiftEfficiency[];
  health: HealthComplianceBadge[];
  rnd: RndVelocityMetric[];
}

/* ------------------------------ helpers ------------------------------ */

/** Health clearance is a hard gate: expired, or fewer than 7 days to renewal. */
export function isHealthCritical(b: HealthComplianceBadge): boolean {
  return b.sanitaryCardStatus === 'expired' || b.daysToRenewal < 7;
}

export function oeeBand(oee: number): 'high' | 'mid' | 'low' {
  if (oee >= 85) return 'high';
  if (oee >= 70) return 'mid';
  return 'low';
}

/* ------------------------------- mock -------------------------------- */

const OPERATORS: LaborShiftEfficiency[] = [
  { workerId: 'W-101', name: 'Ramesh Kumar', facilityId: 'dubai', assignedStage: 'mixing', oeePercentage: 91, activeBatchId: 'MO-5521', shiftStatus: 'optimal' },
  // Linked to MO-5521 (Matcha) which had a +4.2% creamer over-consumption run.
  { workerId: 'W-102', name: 'Suresh Lal', facilityId: 'dubai', assignedStage: 'bottling', oeePercentage: 64, activeBatchId: 'MO-5521', shiftStatus: 'underperforming' },
  { workerId: 'W-103', name: 'Arun Pillai', facilityId: 'ajman', assignedStage: 'mixing', oeePercentage: 88, activeBatchId: 'MO-5522', shiftStatus: 'optimal' },
  { workerId: 'W-104', name: 'Bilal Hossain', facilityId: 'ajman', assignedStage: 'bottling', oeePercentage: 73, activeBatchId: 'MO-5524', shiftStatus: 'optimal' },
  { workerId: 'W-105', name: 'Karim Sayed', facilityId: 'dubai', assignedStage: 'mixing', oeePercentage: 57, activeBatchId: 'MO-5519', shiftStatus: 'underperforming' },
  { workerId: 'W-106', name: 'Imran Ali', facilityId: 'ajman', assignedStage: 'bottling', oeePercentage: 84, activeBatchId: 'MO-5524', shiftStatus: 'optimal' },
  // Assigned to the queued MO-5528 — used to demonstrate the HACCP gate.
  { workerId: 'W-107', name: 'Hassan Omar', facilityId: 'ajman', assignedStage: 'mixing', oeePercentage: 70, activeBatchId: 'MO-5528', shiftStatus: 'optimal' },
];

const HEALTH: HealthComplianceBadge[] = [
  { employeeName: 'Ramesh Kumar', role: 'Mixing Operator', sanitaryCardStatus: 'valid', daysToRenewal: 240 },
  { employeeName: 'Suresh Lal', role: 'Bottling Operator', sanitaryCardStatus: 'expiring', daysToRenewal: 5 },
  { employeeName: 'Arun Pillai', role: 'Mixing Operator', sanitaryCardStatus: 'valid', daysToRenewal: 120 },
  { employeeName: 'Karim Sayed', role: 'Mixing Operator', sanitaryCardStatus: 'expired', daysToRenewal: -12 },
  { employeeName: 'Fatima Noor', role: 'QA Technician', sanitaryCardStatus: 'valid', daysToRenewal: 60 },
  { employeeName: 'Bilal Hossain', role: 'Bottling Operator', sanitaryCardStatus: 'expiring', daysToRenewal: 3 },
  { employeeName: 'Hassan Omar', role: 'Mixing Operator', sanitaryCardStatus: 'expired', daysToRenewal: -3 },
];

const RND: RndVelocityMetric[] = [
  { chemistName: 'Sally Mariya', activeBriefsCount: 4, avgFormulationTimeDays: 11.5, executionRating: 4.6 },
  { chemistName: 'Fazl Syed', activeBriefsCount: 3, avgFormulationTimeDays: 9.2, executionRating: 4.8 },
  { chemistName: 'Zarina Idris', activeBriefsCount: 2, avgFormulationTimeDays: 14.0, executionRating: 4.1 },
  { chemistName: 'Josephine Cruz', activeBriefsCount: 1, avgFormulationTimeDays: 7.5, executionRating: 4.9 },
];

export function buildHrLabor(): HrLaborData {
  return { operators: OPERATORS, health: HEALTH, rnd: RND };
}

/* ------------------- Cross-module HACCP compliance ------------------- */

/** The operator currently assigned to a production batch (by activeBatchId). */
export function operatorForBatch(batchId: string): LaborShiftEfficiency | undefined {
  return OPERATORS.find((o) => o.activeBatchId === batchId);
}

/** That operator's sanitary/health compliance badge, if recorded. */
export function healthForEmployee(name: string): HealthComplianceBadge | undefined {
  return HEALTH.find((h) => h.employeeName === name);
}
