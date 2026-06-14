import 'server-only';
/**
 * lib/odoo/client.ts
 * -------------------------------------------------------------
 * Low-level XML-RPC transport to Odoo. SERVER-ONLY (Node runtime).
 *
 * Exposes:
 *   - commonCall()    → /xmlrpc/2/common   (version, authenticate)
 *   - executeKw()     → /xmlrpc/2/object   (execute_kw on any model)
 *   - searchRead()/searchCount() → typed convenience wrappers
 *
 * Credentials (uid + password/api-key) are passed IN by the caller
 * (see lib/odoo/auth.ts) — this module is pure transport and never
 * decides identity.
 *
 * NOTE: imports `xmlrpc` (Node `net`/`http`) → must NOT be pulled into
 * the Edge middleware bundle. Only Node route handlers / server actions
 * may import this file.
 */
import xmlrpc from 'xmlrpc';

const ODOO_URL = process.env.ODOO_URL;
if (!ODOO_URL) {
  throw new Error('[odoo] Missing required env var ODOO_URL');
}

const IS_SECURE = ODOO_URL.startsWith('https');

/** Build an XML-RPC client bound to a given Odoo endpoint path. */
function createClient(path: string): xmlrpc.Client {
  const url = new URL(path, ODOO_URL).href;
  return IS_SECURE
    ? xmlrpc.createSecureClient({ url })
    : xmlrpc.createClient({ url });
}

// Endpoints are stateless → create once and reuse across requests.
const commonClient = createClient('/xmlrpc/2/common');
const objectClient = createClient('/xmlrpc/2/object');

/** Normalized error so callers can branch on auth vs transport failures. */
export class OdooError extends Error {
  constructor(
    message: string,
    readonly code: 'AUTH' | 'ACCESS' | 'TRANSPORT' | 'FAULT' = 'FAULT',
    readonly faultCode?: number,
  ) {
    super(message);
    this.name = 'OdooError';
  }
}

function normalizeError(err: unknown): OdooError {
  // xmlrpc surfaces Odoo faults as { faultCode, faultString }
  const anyErr = err as { faultString?: string; faultCode?: number; message?: string };
  const msg = anyErr?.faultString ?? anyErr?.message ?? 'Unknown Odoo error';
  if (/access denied|authentication/i.test(msg)) {
    return new OdooError(msg, 'AUTH', anyErr.faultCode);
  }
  if (/access(error| denied)|not allowed|sudo/i.test(msg)) {
    return new OdooError(msg, 'ACCESS', anyErr.faultCode);
  }
  if (anyErr?.faultString) return new OdooError(msg, 'FAULT', anyErr.faultCode);
  return new OdooError(msg, 'TRANSPORT');
}

/** Promisified methodCall. */
function call<T>(client: xmlrpc.Client, method: string, params: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    client.methodCall(method, params, (error, value) => {
      if (error) reject(normalizeError(error));
      else resolve(value as T);
    });
  });
}

/** Call a method on the `common` endpoint (e.g. `authenticate`, `version`). */
export function commonCall<T>(method: string, params: unknown[]): Promise<T> {
  return call<T>(commonClient, method, params);
}

const ODOO_DB = process.env.ODOO_DB;
if (!ODOO_DB) {
  throw new Error('[odoo] Missing required env var ODOO_DB');
}

/**
 * Generic `execute_kw` against any Odoo model.
 * @param uid       authenticated user id
 * @param password  api key / password for that uid
 */
export function executeKw<T>(
  uid: number,
  password: string,
  model: string,
  method: string,
  args: unknown[] = [],
  kwargs: Record<string, unknown> = {},
): Promise<T> {
  return call<T>(objectClient, 'execute_kw', [ODOO_DB, uid, password, model, method, args, kwargs]);
}

/** `search_read` with mandatory field selection + limit (protects the ERP). */
export function searchRead<T = Record<string, unknown>>(
  uid: number,
  password: string,
  model: string,
  domain: unknown[],
  fields: string[],
  opts: { limit?: number; offset?: number; order?: string } = {},
): Promise<T[]> {
  return executeKw<T[]>(uid, password, model, 'search_read', [domain], {
    fields,
    limit: opts.limit ?? 200,
    offset: opts.offset ?? 0,
    ...(opts.order ? { order: opts.order } : {}),
  });
}

/** `search_count` — cheap totals for pagination. */
export function searchCount(
  uid: number,
  password: string,
  model: string,
  domain: unknown[],
): Promise<number> {
  return executeKw<number>(uid, password, model, 'search_count', [domain]);
}
