/**
 * features/admin/schema.ts
 * -------------------------------------------------------------
 * Module 7 — Integration Console & Governance Admin.
 *
 * PURE module (no 'server-only', no 'use server'): only types + deterministic
 * seed builders live here, so it can be imported by BOTH the server actions
 * and the client console without dragging Node-only deps across the Edge.
 *
 * Runtime gate-override state lives in `features/admin/flags.ts` (server-only).
 * The idempotency audit rows are read from `features/sales/idempotency.ts`
 * (server-only) inside the server action and re-shaped into the PURE `LedgerRow`
 * declared below — we never import the server-only ledger type into the client.
 */

/* ------------------------------------------------------------------ */
/* Task A — Core API Health Monitor (the Ping Board)                  */
/* ------------------------------------------------------------------ */

export type ApiService = 'odoo_xmlrpc' | 'whatsapp_meta' | 'vercel_kv';
export type ApiHealth = 'online' | 'degraded' | 'offline';

export interface ApiStatus {
  service: ApiService;
  status: ApiHealth;
  latencyMs: number;
}

/** Ordered list of the enterprise data pipelines we surface on the board. */
export const API_SERVICES: ApiService[] = ['odoo_xmlrpc', 'whatsapp_meta', 'vercel_kv'];

/**
 * Synthetic ping. A real implementation would `commonCall('version')` against
 * Odoo, HEAD the Meta webhook, and PING Vercel KV; here we jitter latency and
 * derive a band so "Run Diagnostic Check" produces visibly live indicators.
 */
export function pingServices(seed = Date.now()): ApiStatus[] {
  return API_SERVICES.map((service, i) => {
    // Deterministic-per-call pseudo jitter (no external RNG to keep it pure).
    const noise = Math.abs(Math.sin(seed / 1000 + i * 1.7));
    const base = { odoo_xmlrpc: 90, whatsapp_meta: 140, vercel_kv: 28 }[service];
    const latencyMs = Math.round(base + noise * base * 0.8);
    const status: ApiHealth = latencyMs > base * 1.5 ? 'degraded' : 'online';
    return { service, status, latencyMs };
  });
}

/* ------------------------------------------------------------------ */
/* Task B — Idempotency Ledger row (PURE mirror of LedgerEntry)        */
/* ------------------------------------------------------------------ */

export type LedgerRowStatus = 'pending' | 'processed' | 'failed';

export interface LedgerRow {
  messageId: string;
  status: LedgerRowStatus;
  receivedAt: string; // ISO
  processedAt: string | null; // ISO
  error?: string;
}

export interface LedgerStats {
  pending: number;
  processed: number;
  failed: number;
}

/**
 * Demonstration fallback. The live ledger is an in-memory Map that resets on a
 * cold serverless start, so when it is empty (no recent WhatsApp traffic) the
 * server action supplies this representative slice so the auditor is never blank.
 */
export function demoLedger(now = Date.now()): LedgerRow[] {
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
  return [
    {
      messageId: 'wamid.HBgLOTcxNTA0MjI3NzEVAgAR',
      status: 'processed',
      receivedAt: iso(1000 * 42),
      processedAt: iso(1000 * 41),
    },
    {
      messageId: 'wamid.HBgLOTcxNTA1ODg2MTEVAgAS',
      status: 'pending',
      receivedAt: iso(1000 * 6),
      processedAt: null,
    },
    {
      messageId: 'wamid.HBgLOTcxNTA2NDExMjAVAgAT',
      status: 'failed',
      receivedAt: iso(1000 * 60 * 4),
      processedAt: iso(1000 * 60 * 4 - 800),
      error: 'OdooError: createLead → res.partner match ambiguous (3 candidates)',
    },
    {
      messageId: 'wamid.HBgLOTcxNTA3OTAwODgVAgAU',
      status: 'processed',
      receivedAt: iso(1000 * 60 * 11),
      processedAt: iso(1000 * 60 * 11 - 600),
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Task C — Strategic Feature Flags (master override switches)        */
/* ------------------------------------------------------------------ */

export type GateId = 'credit_lock' | 'haccp_lock';

export interface GateConfig {
  id: GateId;
  label: string;
  isEnabled: boolean;
  bypassRoles: string[];
}

/**
 * Default governance posture: both enforcement gates ON. `bypassRoles` lists the
 * portal roles permitted to override the block (informational here; the runtime
 * store in flags.ts owns the live boolean).
 */
export const DEFAULT_GATES: GateConfig[] = [
  { id: 'credit_lock', label: 'Global Credit Limit Enforcement', isEnabled: true, bypassRoles: ['admin', 'finance'] },
  { id: 'haccp_lock', label: 'HACCP Sanitary Clearance Gate', isEnabled: true, bypassRoles: ['admin'] },
];

/* ------------------------------------------------------------------ */
/* Aggregate payload                                                  */
/* ------------------------------------------------------------------ */

export interface AdminConsoleData {
  apis: ApiStatus[];
  ledger: LedgerRow[];
  ledgerStats: LedgerStats;
  gates: GateConfig[];
}
