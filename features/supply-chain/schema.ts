/**
 * features/supply-chain/schema.ts
 * -------------------------------------------------------------
 * Types for the Fulfillment & Batch Logistics tracker.
 *
 * Mock for now, but the shapes mirror the Odoo models we'll join later:
 *   - Shipment  ← stock.picking (state, partner_id, sale_id, dest, scheduled_date)
 *   - batchNumber ← stock.lot / mrp.production (lot_producing_id)
 *   - FactoryLoad ← mrp.workcenter load / capacity
 */

export type LogisticsStage = 'warehouse' | 'customs' | 'transit' | 'delivered';

export const STAGE_ORDER: LogisticsStage[] = ['warehouse', 'customs', 'transit', 'delivered'];

export interface Shipment {
  id: string;
  orderNo: string;
  sku: string;
  productName: string;
  client: string;
  destination: string;
  batchNumber: string; // traceability link order ↔ production batch
  stage: LogisticsStage;
  progress: number; // 0–100 along the chain
  qtyKg: number;
  eta: string; // ISO date
}

export interface FactoryLoad {
  name: string;
  location: string;
  loadPct: number; // 0–100 capacity utilization
  capacityTons: number;
}

export interface FulfillmentData {
  factories: FactoryLoad[];
  shipments: Shipment[];
}
