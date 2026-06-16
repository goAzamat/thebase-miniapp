/**
 * features/procurement/schema.ts
 * -------------------------------------------------------------
 * Procurement & Import Control Center — types, mock corpus and pure helpers.
 * Replaces the reactive Excel/WhatsApp workflow with structured records that
 * map cleanly onto Odoo (purchase.requisition, stock.picking, mail templates).
 */

/* ---------------------------- Requisitions --------------------------- */

export type PRStatus = 'draft' | 'pending_approval' | 'converted_to_po';

export interface PurchaseRequisition {
  id: string;
  ingredientName: string;
  requestedQtyKg: number;
  status: PRStatus;
  createdAt: string; // ISO
  odooId?: number; // purchase.order id once created in Odoo (draft RFQ)
}

/* ------------------------------ Shipments ---------------------------- */

export type FreightMode = 'air' | 'sea';
export type ShipmentStatus = 'customs' | 'transit' | 'arrived';

/** The 7 mandatory regulatory documents for import customs clearance. */
export interface ImportDocs {
  consignmentNote: boolean; // CN
  invoice: boolean; // INV
  billOfLading: boolean; // BL / AWB
  packingList: boolean; // PL
  undertakingLetter: boolean; // UL
  healthCertificate: boolean; // HC
  certificateOfOrigin: boolean; // CO
}

export interface ImportShipment {
  id: string;
  mode: FreightMode;
  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  supplier: string;
  etaDays: number; // days until arrival (0 = arrived)
  documents: ImportDocs;
}

/* -------------------------------- RFQ -------------------------------- */

export type RFQStatus = 'sent_whatsapp' | 'received_quote' | 'rejected';

export interface SupplierRFQ {
  id: string;
  supplierName: string;
  ingredientName: string;
  targetPriceAed: number;
  status: RFQStatus;
}

/* --------------------------- Reorder ledger -------------------------- */

export type ReorderStatus = 'safe' | 'reorder' | 'danger';

export interface ReorderPoint {
  id: string;
  ingredientName: string;
  sku?: string; // Odoo product default_code (matching key for live stock)
  currentStockKg: number;
  avgMonthlyKg: number; // 3-month average consumption
  daysUntilStockout: number;
  status: ReorderStatus;
  live?: boolean; // true when currentStockKg came from Odoo stock.quant
}

export interface ProcurementData {
  reorderPoints: ReorderPoint[];
  shipments: ImportShipment[];
  rfqs: SupplierRFQ[];
  requisitions: PurchaseRequisition[];
}

/* ------------------------------ helpers ------------------------------ */

/** Days-to-stockout + status flag from stock and 3-month average usage. */
export function computeReorder(currentStockKg: number, avgMonthlyKg: number): {
  daysUntilStockout: number;
  status: ReorderStatus;
} {
  const perDay = avgMonthlyKg / 30;
  const days = perDay > 0 ? Math.round(currentStockKg / perDay) : 999;
  const status: ReorderStatus = days <= 7 ? 'danger' : days <= 21 ? 'reorder' : 'safe';
  return { daysUntilStockout: days, status };
}

/** A standardized RFQ message ready to paste into WhatsApp / Email. */
export function buildRfqTemplate(
  supplier: string,
  ingredient: string,
  qtyKg: number,
  targetPriceAed: number,
): string {
  return [
    `Hello ${supplier},`,
    '',
    'THE BASE — Request for Quotation:',
    `• Ingredient: ${ingredient}`,
    `• Quantity: ${qtyKg} kg`,
    `• Target price: AED ${targetPriceAed}/kg`,
    '• Incoterm: CIF Dubai (Jebel Ali)',
    '• Required docs: Commercial Invoice, Packing List, Health Certificate, Certificate of Origin',
    '',
    'Please confirm unit price, MOQ, lead time and HALAL / ISO 22000 certification.',
    '',
    'Thank you,',
    'Procurement · THE BASE',
  ].join('\n');
}

export const DOC_KEYS: Array<{ key: keyof ImportDocs; code: string }> = [
  { key: 'consignmentNote', code: 'CN' },
  { key: 'invoice', code: 'INV' },
  { key: 'billOfLading', code: 'BL' },
  { key: 'packingList', code: 'PL' },
  { key: 'undertakingLetter', code: 'UL' },
  { key: 'healthCertificate', code: 'HC' },
  { key: 'certificateOfOrigin', code: 'CO' },
];

/* ------------------------------- mock -------------------------------- */

// Top-20 raw-material positions (name, Odoo SKU/default_code, seed stock kg,
// 3-month avg kg/mo). The SKU is the matching key for live stock.quant values.
const RAW_LEDGER: Array<[string, string, number, number]> = [
  ['Matcha BHM568', 'EX-BHF-004', 305, 120],
  ['Extra Fine Sugar', 'MI-WLQ-003', 9800, 6200],
  ['Non Dairy Creamer (32%)', 'MI-ATM-004', 410, 1300],
  ['Cocoa Powder Alkalized', 'MI-GMT-010', 287, 240],
  ['Cardamom Seed Extract', 'EX-BZK-005', 9, 22],
  ['Anchan Blue (Butterfly Pea)', 'EX-BHF-034', 2520, 180],
  ['Hibiscus / Karkade Extract', 'EX-HIB-001', 14, 60],
  ['Date Powder', 'EX-BKH-033', 88, 130],
  ['Skimmed Milk Powder', 'MI-WLQ-006', 20, 95],
  ['Citric Acid Anhydrous', 'AD-GMT-014', 162, 110],
  ['Maltodextrin Powder', 'SW-CMC-009', 0, 480],
  ['Whip Powder (Whiptreme 8313)', 'AD-KRY-018', 629, 210],
  ['Instant Black Tea Powder', 'EX-BHF-001', 578, 160],
  ['Strawberry FD Powder', 'EX-BHF-056', 55, 70],
  ['Mango FD Powder', 'EX-BHF-057', 56, 90],
  ['Pistachio Flavouring Powder', 'FL-DHL-033', 75, 40],
  ['Saffron Encap FL82754', 'FL-RED-041', 96, 18],
  ['Stevia Extract 85%', 'EX-CMC-078', 50, 38],
  ['Xanthan Gum Food Grade', 'ST-CMC-003', 111, 60],
  ['Coconut Flavouring Powder', 'FL-DHL-011', 61, 75],
];

const MOCK_SHIPMENTS: ImportShipment[] = [
  {
    id: 'SHP-AIR-7741',
    mode: 'air',
    carrier: 'Emirates SkyCargo',
    trackingNumber: '176-44218890',
    status: 'transit',
    supplier: 'BHF Ingredients (CN)',
    etaDays: 2,
    documents: { consignmentNote: true, invoice: true, billOfLading: true, packingList: true, undertakingLetter: true, healthCertificate: false, certificateOfOrigin: true },
  },
  {
    id: 'SHP-AIR-7745',
    mode: 'air',
    carrier: 'Qatar Airways Cargo',
    trackingNumber: '157-99203145',
    status: 'customs',
    supplier: 'Mane (FR)',
    etaDays: 1,
    documents: { consignmentNote: true, invoice: true, billOfLading: true, packingList: true, undertakingLetter: false, healthCertificate: true, certificateOfOrigin: true },
  },
  {
    id: 'SHP-SEA-3320',
    mode: 'sea',
    carrier: 'Maersk',
    trackingNumber: 'MRKU-5582019',
    status: 'transit',
    supplier: 'Olam Food Ingredients',
    etaDays: 14,
    documents: { consignmentNote: true, invoice: true, billOfLading: true, packingList: false, undertakingLetter: false, healthCertificate: false, certificateOfOrigin: false },
  },
  {
    id: 'SHP-SEA-3325',
    mode: 'sea',
    carrier: 'CMA CGM',
    trackingNumber: 'CMAU-7741203',
    status: 'customs',
    supplier: 'Silesia (DE)',
    etaDays: 3,
    documents: { consignmentNote: true, invoice: true, billOfLading: true, packingList: true, undertakingLetter: true, healthCertificate: false, certificateOfOrigin: true },
  },
  {
    id: 'SHP-AIR-7750',
    mode: 'air',
    carrier: 'Turkish Cargo',
    trackingNumber: '235-66120044',
    status: 'arrived',
    supplier: 'Stockmeier (DE)',
    etaDays: 0,
    documents: { consignmentNote: true, invoice: true, billOfLading: true, packingList: true, undertakingLetter: true, healthCertificate: true, certificateOfOrigin: true },
  },
];

const MOCK_RFQS: SupplierRFQ[] = [
  { id: 'RFQ-101', supplierName: 'Givaudan', ingredientName: 'Hibiscus / Karkade Extract', targetPriceAed: 240, status: 'sent_whatsapp' },
  { id: 'RFQ-102', supplierName: 'BHF Ingredients', ingredientName: 'Matcha BHM568', targetPriceAed: 120, status: 'received_quote' },
  { id: 'RFQ-103', supplierName: 'Mane', ingredientName: 'Cardamom Seed Extract', targetPriceAed: 360, status: 'sent_whatsapp' },
  { id: 'RFQ-104', supplierName: 'Olam', ingredientName: 'Cocoa Powder Alkalized', targetPriceAed: 34, status: 'rejected' },
];

const MOCK_REQUISITIONS: PurchaseRequisition[] = [
  { id: 'PR-2026-0042', ingredientName: 'Maltodextrin Powder', requestedQtyKg: 1000, status: 'pending_approval', createdAt: '2026-06-16T10:00:00Z' },
];

export function buildProcurement(): ProcurementData {
  const reorderPoints: ReorderPoint[] = RAW_LEDGER.map(([name, sku, stock, avg], i) => {
    const { daysUntilStockout, status } = computeReorder(stock, avg);
    return { id: `RP-${i + 1}`, ingredientName: name, sku, currentStockKg: stock, avgMonthlyKg: avg, daysUntilStockout, status };
  }).sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

  return {
    reorderPoints,
    shipments: MOCK_SHIPMENTS,
    rfqs: MOCK_RFQS,
    requisitions: MOCK_REQUISITIONS,
  };
}

/** Distinct supplier + ingredient lists for the RFQ generator selects. */
export const RFQ_SUPPLIERS = ['Givaudan', 'BHF Ingredients', 'Mane', 'Olam', 'Silesia', 'Symrise', 'Firmenich'];

/* ------------------- Credit-gate result contract --------------------- */

export interface CreditLockViolation {
  success: false;
  error: 'CREDIT_LOCK_VIOLATION';
  client: string;
}

export type CreatePrResult = { success: true; pr: PurchaseRequisition } | CreditLockViolation;
