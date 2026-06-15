'use server';
/**
 * features/supply-chain/server.ts
 * -------------------------------------------------------------
 * Fulfillment data. CURRENTLY MOCK — representative records so the UI is
 * fully functional. The function shape matches our other modules, so the
 * Odoo integration is a drop-in replacement:
 *
 *   TODO(odoo): replace the mock with serviceSearchRead calls:
 *     - stock.picking  → ['name','partner_id','state','scheduled_date','sale_id',
 *                         'move_ids', 'location_dest_id']
 *     - stock.lot / mrp.production → batch (lot) number per move
 *     - mrp.workcenter → factory load / capacity
 *   then map stock.picking.state → LogisticsStage and compute `progress`.
 */
import type { FulfillmentData } from './schema';

const MOCK: FulfillmentData = {
  factories: [
    { name: 'Dubai · Al Quoz', location: 'UAE', loadPct: 78, capacityTons: 120 },
    { name: 'Ajman Plant', location: 'UAE', loadPct: 54, capacityTons: 80 },
    { name: 'Malaysia (commissioning)', location: 'MY', loadPct: 19, capacityTons: 150 },
  ],
  shipments: [
    { id: 's1', orderNo: 'SO-24817', sku: 'MT-002-f500', productName: 'Matcha Classic', client: "Barn's Cafe", destination: 'Jeddah, KSA', batchNumber: 'B-2406-0142', stage: 'transit', progress: 68, qtyKg: 900, eta: '2026-06-22' },
    { id: 's2', orderNo: 'SO-24820', sku: 'CL-001-f500', productName: 'Karak Chai', client: 'Half Million', destination: 'Riyadh, KSA', batchNumber: 'B-2406-0148', stage: 'customs', progress: 42, qtyKg: 1500, eta: '2026-06-24' },
    { id: 's3', orderNo: 'SO-24805', sku: 'CC-002-f500', productName: 'Chocolate Classic', client: 'Coffee Like', destination: 'Izhevsk, RU', batchNumber: 'B-2405-0991', stage: 'delivered', progress: 100, qtyKg: 600, eta: '2026-06-12' },
    { id: 's4', orderNo: 'SO-24831', sku: 'RF-002-f500', productName: 'Raf Ptichye Moloko', client: 'Zebra Coffee', destination: 'Astana, KZ', batchNumber: 'B-2406-0151', stage: 'warehouse', progress: 12, qtyKg: 450, eta: '2026-06-28' },
    { id: 's5', orderNo: 'SO-24828', sku: 'IT-001-f500', productName: 'Iced Tea Peach', client: 'Bidfood UAE', destination: 'Dubai, UAE', batchNumber: 'B-2406-0150', stage: 'transit', progress: 81, qtyKg: 1200, eta: '2026-06-20' },
    { id: 's6', orderNo: 'SO-24834', sku: 'MS-007-f500', productName: 'Milkshake Banana', client: 'Tree of Life', destination: 'Amman, JO', batchNumber: 'B-2406-0153', stage: 'warehouse', progress: 8, qtyKg: 300, eta: '2026-07-01' },
  ],
};

export async function getFulfillment(): Promise<FulfillmentData> {
  // Simulate latency so loading states are visible in dev.
  await new Promise((r) => setTimeout(r, 150));
  return MOCK;
}
