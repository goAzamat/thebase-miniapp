'use server';
/**
 * features/shared/server.ts
 * -------------------------------------------------------------
 * Server Actions for the cross-module corporate datasets. Currently backed by
 * the interrelated mock layer; each function is the seam where the real Odoo
 * binding drops in (stock.picking, mrp.production, account.move, hr.employee).
 */
import {
  MOCK_FORMULAS,
  MOCK_OPPORTUNITIES,
  MOCK_CAPACITIES,
  MOCK_BATCHES,
  MOCK_FINANCE,
  MOCK_HR,
  MOCK_ADMIN,
  predictivePipelineMetrics,
} from './mock';
import type {
  FactoryCapacity,
  ProductionBatch,
  FinancialSnapshot,
  HrMetrics,
  AdminIntegration,
  PipelineMetrics,
} from '@/types/erp';

const tick = () => new Promise<void>((r) => setTimeout(r, 120));

export async function getFactoryCapacity(): Promise<FactoryCapacity[]> {
  await tick();
  return MOCK_CAPACITIES;
}

export async function getProductionBatches(): Promise<ProductionBatch[]> {
  await tick();
  return MOCK_BATCHES;
}

export async function getFinancialSnapshot(): Promise<FinancialSnapshot> {
  await tick();
  return MOCK_FINANCE;
}

export async function getHrMetrics(): Promise<HrMetrics> {
  await tick();
  return MOCK_HR;
}

export async function getAdminIntegration(): Promise<AdminIntegration> {
  await tick();
  return MOCK_ADMIN;
}

/** Sales ➔ Production & Supply Chain predictive aggregate. */
export async function getPipelineMetrics(): Promise<PipelineMetrics> {
  await tick();
  return predictivePipelineMetrics(MOCK_OPPORTUNITIES, MOCK_FORMULAS, MOCK_CAPACITIES);
}
