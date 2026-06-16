import 'server-only';
/**
 * features/procurement/odoo-stock.ts
 * -------------------------------------------------------------
 * Live Odoo inventory reader + Purchase Requisition writer (Node/XML-RPC,
 * SERVER-ONLY). Isolated from the Edge runtime; every call is wrapped by the
 * caller in try/catch so the dashboard silently falls back to seed data.
 */
import { commonCall, executeKw, OdooError } from '@/lib/odoo/client';

const ODOO_DB = process.env.ODOO_DB ?? '';
const ODOO_USERNAME = process.env.ODOO_USERNAME ?? '';
const ODOO_API_KEY = process.env.ODOO_API_KEY ?? '';

let serviceUid: number | null = null;

async function getUid(): Promise<number> {
  if (serviceUid) return serviceUid;
  if (!ODOO_DB || !ODOO_USERNAME || !ODOO_API_KEY) {
    throw new OdooError('Missing ODOO_DB / ODOO_USERNAME / ODOO_API_KEY', 'AUTH');
  }
  const uid = await commonCall<number | false>('authenticate', [ODOO_DB, ODOO_USERNAME, ODOO_API_KEY, {}]);
  if (!uid || typeof uid !== 'number') throw new OdooError('Service authentication failed', 'AUTH');
  serviceUid = uid;
  return uid;
}

async function exec<T>(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) {
  const uid = await getUid();
  return executeKw<T>(uid, ODOO_API_KEY, model, method, args, kwargs);
}

/* ------------------------------ stock read --------------------------- */

export interface LiveStock {
  code: string | null; // product default_code parsed from "[CODE] Name"
  productId: number;
  productName: string;
  quantity: number; // physical on-hand
  locationId: number;
  locationName: string; // e.g. "AlQuoz/Stock", "Ajman/Stock"
}

/**
 * Read physical stock from stock.quant across internal locations. Quantities
 * are returned per (product × location) so Dubai vs Ajman can be distinguished.
 */
export async function fetchLiveOdooStocks(): Promise<LiveStock[]> {
  const rows = await exec<
    Array<{
      product_id: [number, string] | false;
      quantity: number;
      location_id: [number, string] | false;
    }>
  >('stock.quant', 'search_read', [[['location_id.usage', '=', 'internal']]], {
    fields: ['product_id', 'quantity', 'location_id'],
    limit: 5000,
  });

  return rows.map((r) => {
    const display = r.product_id ? r.product_id[1] : '';
    const m = display.match(/\[([^\]]+)\]/);
    return {
      code: m ? m[1] : null,
      productId: r.product_id ? r.product_id[0] : 0,
      productName: display.replace(/^\[[^\]]*\]\s*/, ''),
      quantity: r.quantity ?? 0,
      locationId: r.location_id ? r.location_id[0] : 0,
      locationName: r.location_id ? r.location_id[1] : '',
    };
  });
}

/** Aggregate on-hand quantity by product default_code across all locations. */
export function stockByCode(rows: LiveStock[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.code) continue;
    map.set(r.code, (map.get(r.code) ?? 0) + r.quantity);
  }
  return map;
}

/* --------------------- purchase order writer ------------------------- */

/**
 * Resolve the assigned vendor for a product via product.supplierinfo.
 * Returns the res.partner id, or the env fallback vendor, or null.
 *
 * NOTE: on Odoo 14+ the vendor field is `partner_id`. Legacy Odoo (≤ v8) used
 * `name` as the partner m2o — switch the field below if targeting old servers.
 */
async function resolveVendor(productId: number): Promise<number | null> {
  // Variant → template, so we can match both variant- and template-level rules.
  let tmplId: number | undefined;
  try {
    const [p] = await exec<Array<{ product_tmpl_id: [number, string] | false }>>(
      'product.product',
      'read',
      [[productId], ['product_tmpl_id']],
    );
    tmplId = p && p.product_tmpl_id ? p.product_tmpl_id[0] : undefined;
  } catch {
    /* template read is best-effort */
  }

  const domain: unknown[] = tmplId
    ? ['|', ['product_id', '=', productId], ['product_tmpl_id', '=', tmplId]]
    : [['product_id', '=', productId]];

  const rows = await exec<Array<{ partner_id: [number, string] | false }>>(
    'product.supplierinfo',
    'search_read',
    [domain],
    { fields: ['partner_id'], order: 'sequence,min_qty', limit: 1 },
  );

  const partner = rows[0]?.partner_id;
  if (partner && Array.isArray(partner)) return partner[0];

  const fallback = parseInt(process.env.ODOO_DEFAULT_VENDOR_ID ?? '', 10);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}

/**
 * Resolve the product (by SKU, then by name), resolve its vendor, and create a
 * DRAFT purchase.order (RFQ) with a single line. Returns the new PO id, or null
 * if the product / vendor can't be resolved (caller falls back gracefully).
 */
export async function createOdooPurchaseOrder(input: {
  sku?: string;
  ingredientName: string;
  requestedQtyKg: number;
}): Promise<number | null> {
  // 1) Resolve product.product.
  let productId: number | undefined;
  if (input.sku) {
    const byCode = await exec<number[]>('product.product', 'search', [[['default_code', '=', input.sku]]], { limit: 1 });
    productId = byCode[0];
  }
  if (!productId) {
    const byName = await exec<number[]>('product.product', 'search', [[['name', 'ilike', input.ingredientName]]], { limit: 1 });
    productId = byName[0];
  }
  if (!productId) return null;

  // 2) Auto-resolve the vendor (a purchase.order requires a partner_id).
  const vendorId = await resolveVendor(productId);
  if (!vendorId) return null;

  // 3) Create the draft purchase.order (RFQ state).
  const poId = await exec<number>('purchase.order', 'create', [{
    partner_id: vendorId,
    state: 'draft',
    origin: 'THE BASE Portal · Smart Reorder',
    order_line: [[0, 0, { product_id: productId, product_qty: input.requestedQtyKg, price_unit: 0.0 }]],
  }]);
  return poId;
}
