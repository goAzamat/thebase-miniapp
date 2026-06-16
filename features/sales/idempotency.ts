import 'server-only';
/**
 * features/sales/idempotency.ts
 * -------------------------------------------------------------
 * WhatsApp message idempotency / dedup ledger.
 *
 * Tracks every inbound `message_id` so duplicate webhook deliveries (Meta
 * retries, or identical concurrent POSTs) never create duplicate Odoo leads.
 *
 * IMPLEMENTATION: in-memory register (module-scoped Map) — shared across
 * invocations within one warm serverless instance, which is exactly where
 * Meta's burst retries land. `claimMessage()` is SYNCHRONOUS (no await between
 * read and write) so two concurrent handlers in the same instance can't both
 * win the claim — the JS event loop guarantees atomicity.
 *
 * PRODUCTION UPGRADE (cross-instance durability): swap the Map for Vercel KV /
 * Upstash Redis. `claimMessage()` becomes `SET key val NX PX <ttl>` — the
 * atomic NX flag gives the same first-writer-wins semantics across instances.
 * The exported interface below is intentionally KV-shaped to make that a
 * drop-in change.
 */

export type LedgerStatus = 'pending' | 'processed' | 'failed';

export interface LedgerEntry {
  messageId: string;
  status: LedgerStatus;
  receivedAt: string; // ISO
  processedAt: string | null; // ISO
  error?: string;
}

const ledger = new Map<string, LedgerEntry>();
const RETENTION_MS = 1000 * 60 * 60 * 24; // keep 24h of history

/** Drop entries older than the retention window (amortized, cheap). */
function sweep(): void {
  const cutoff = Date.now() - RETENTION_MS;
  for (const [id, entry] of ledger) {
    if (new Date(entry.receivedAt).getTime() < cutoff) ledger.delete(id);
  }
}

export interface ClaimResult {
  firstClaim: boolean; // true → caller owns processing
  entry: LedgerEntry;
}

/**
 * Atomically claim a message_id. Returns firstClaim=true only for the very
 * first caller; every subsequent (duplicate/concurrent) call gets false and
 * the existing entry. MUST stay synchronous to remain race-safe.
 */
export function claimMessage(messageId: string): ClaimResult {
  const existing = ledger.get(messageId);
  if (existing) return { firstClaim: false, entry: existing };

  const entry: LedgerEntry = {
    messageId,
    status: 'pending',
    receivedAt: new Date().toISOString(),
    processedAt: null,
  };
  ledger.set(messageId, entry); // claim before any await happens upstream
  if (ledger.size % 250 === 0) sweep();
  return { firstClaim: true, entry };
}

export function markProcessed(messageId: string): void {
  const e = ledger.get(messageId);
  if (e) {
    e.status = 'processed';
    e.processedAt = new Date().toISOString();
  }
}

export function markFailed(messageId: string, error: string): void {
  const e = ledger.get(messageId);
  if (e) {
    e.status = 'failed';
    e.processedAt = new Date().toISOString();
    e.error = error.slice(0, 300);
  }
}

/** Admin auditing: recent ledger entries, newest first. */
export function getLedger(limit = 100): LedgerEntry[] {
  return [...ledger.values()]
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, limit);
}

export function ledgerStats(): Record<LedgerStatus, number> {
  const stats: Record<LedgerStatus, number> = { pending: 0, processed: 0, failed: 0 };
  for (const e of ledger.values()) stats[e.status] += 1;
  return stats;
}
