import 'server-only';
/**
 * features/production/odoo-mrp.ts
 * -------------------------------------------------------------
 * Live Odoo Manufacturing reader (Node/XML-RPC, SERVER-ONLY). Reads
 * mrp.production headers so the floor monitor reflects real batch state.
 * Callers wrap in try/catch → silent fallback to seed.
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

export interface LiveMrp {
  name: string; // MO reference
  origin: string; // source document (links to SO)
  state: string; // draft|confirmed|progress|to_close|done|cancel
  qtyProduced: number;
  productName: string;
}

export async function fetchMrpProductions(): Promise<LiveMrp[]> {
  const rows = await exec<
    Array<{
      name: string;
      origin: string | false;
      state: string;
      product_qty: number;
      qty_producing: number;
      product_id: [number, string] | false;
    }>
  >('mrp.production', 'search_read', [[]], {
    fields: ['name', 'origin', 'state', 'product_qty', 'qty_producing', 'product_id'],
    limit: 100,
    order: 'id desc',
  });

  return rows.map((r) => ({
    name: r.name,
    origin: (r.origin || '').toString(),
    state: r.state,
    qtyProduced: r.qty_producing || r.product_qty || 0,
    productName: r.product_id ? r.product_id[1] : '',
  }));
}
