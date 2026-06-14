import 'server-only';
/**
 * lib/odoo/auth.ts
 * -------------------------------------------------------------
 * Identity + service-account access to Odoo.
 *
 * Two distinct responsibilities:
 *
 *  1) LOGIN (per-user, one-shot): authenticateOdoo() + fetchUserProfile()
 *     verify the human's own Odoo credentials and read their security
 *     groups. The user's key is used only during sign-in and is NEVER
 *     persisted (see lib/auth/config.ts).
 *
 *  2) DATA READS (shared, ongoing): the dashboard queries Odoo through a
 *     single SERVICE ACCOUNT (env ODOO_USERNAME / ODOO_API_KEY). This pairs
 *     with the shared server cache (one Odoo hit serves every user) and the
 *     app-layer RBAC. Row scoping is enforced in-app, not by Odoo ACLs.
 */
import { commonCall, executeKw, searchRead, searchCount, OdooError } from './client';

const ODOO_DB = process.env.ODOO_DB!;
const ODOO_SERVICE_USER = process.env.ODOO_USERNAME;
const ODOO_SERVICE_KEY = process.env.ODOO_API_KEY;

/* ----------------------------- LOGIN FLOW ----------------------------- */

/**
 * Authenticate a human against Odoo. Returns the uid on success, or null
 * if the credentials are invalid (so the Auth.js authorize() can reject).
 */
export async function authenticateOdoo(login: string, key: string): Promise<number | null> {
  // common.authenticate(db, login, password, user_agent_env) → uid | false
  const uid = await commonCall<number | false>('authenticate', [ODOO_DB, login, key, {}]);
  return typeof uid === 'number' && uid > 0 ? uid : null;
}

export interface OdooUserProfile {
  uid: number;
  name: string;
  login: string;
  lang: string;       // e.g. "en_US", "ru_RU", "ar_001"
  groups: string[];   // res.groups.full_name, e.g. "THE BASE Portal / R&D"
}

/**
 * Read the authenticated user's profile + security groups.
 * Uses the user's OWN uid/key — a user can always read their own record.
 */
export async function fetchUserProfile(uid: number, key: string): Promise<OdooUserProfile> {
  const [user] = await executeKw<
    Array<{ name: string; login: string; lang: string; groups_id: number[] }>
  >(uid, key, 'res.users', 'read', [[uid], ['name', 'login', 'lang', 'groups_id']]);

  if (!user) throw new OdooError('User record not found after authentication', 'AUTH');

  const groups = await executeKw<Array<{ full_name: string }>>(
    uid,
    key,
    'res.groups',
    'read',
    [user.groups_id, ['full_name']],
  );

  return {
    uid,
    name: user.name,
    login: user.login,
    lang: user.lang || 'en_US',
    groups: groups.map((g) => g.full_name),
  };
}

/* --------------------------- SERVICE ACCOUNT --------------------------- */

let serviceUidCache: number | null = null;

/** Authenticate the shared service account once, then memoize its uid. */
async function getServiceUid(): Promise<number> {
  if (serviceUidCache) return serviceUidCache;
  if (!ODOO_SERVICE_USER || !ODOO_SERVICE_KEY) {
    throw new OdooError('Missing ODOO_USERNAME / ODOO_API_KEY service credentials', 'AUTH');
  }
  const uid = await authenticateOdoo(ODOO_SERVICE_USER, ODOO_SERVICE_KEY);
  if (!uid) throw new OdooError('Service account authentication failed (check ODOO_API_KEY)', 'AUTH');
  serviceUidCache = uid;
  return uid;
}

/**
 * search_read as the service account. This is the single entry point that
 * `features/<module>/server.ts` use for all dashboard reads — wrap it in
 * the shared server cache (lib/odoo/cache.ts) when calling.
 */
export async function serviceSearchRead<T = Record<string, unknown>>(
  model: string,
  domain: unknown[],
  fields: string[],
  opts?: { limit?: number; offset?: number; order?: string },
): Promise<T[]> {
  const uid = await getServiceUid();
  return searchRead<T>(uid, ODOO_SERVICE_KEY!, model, domain, fields, opts);
}

/** search_count as the service account. */
export async function serviceSearchCount(model: string, domain: unknown[]): Promise<number> {
  const uid = await getServiceUid();
  return searchCount(uid, ODOO_SERVICE_KEY!, model, domain);
}
