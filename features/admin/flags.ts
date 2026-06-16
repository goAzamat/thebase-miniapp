import 'server-only';
/**
 * features/admin/flags.ts
 * -------------------------------------------------------------
 * Runtime gate-override store for the cross-module enforcement gates.
 *
 * WHY a separate server-only module (and not the pure schema.ts):
 *   `isCreditLocked()` / `isHealthCritical()` are PURE functions imported by
 *   client components too. Runtime mutable state cannot live next to them
 *   without leaking server state into the Edge/client bundle. So the live
 *   on/off boolean lives here, and ONLY the server-action enforcement seams
 *   (finance/production/procurement) consult `gateEnabled()` before blocking.
 *
 * SEMANTICS: a gate that is ENABLED enforces the block (default, fail-safe). A
 * disabled gate is an administrative bypass — the validation error is suppressed.
 *
 * DURABILITY: module-scoped Map, same warm-instance lifetime as the idempotency
 * ledger. Production upgrade: back this with Vercel KV so an override set by an
 * admin is visible to every serverless instance.
 */
import { DEFAULT_GATES, type GateConfig, type GateId } from './schema';

const overrides = new Map<GateId, boolean>();

/** True when the gate should actively enforce its block. Defaults to ON. */
export function gateEnabled(id: GateId): boolean {
  const v = overrides.get(id);
  return v === undefined ? true : v;
}

/** Administrative override. Returns the new effective gate roster. */
export function setGate(id: GateId, enabled: boolean): GateConfig[] {
  overrides.set(id, enabled);
  return getGates();
}

/** Current gate roster with live `isEnabled` resolved from the override store. */
export function getGates(): GateConfig[] {
  return DEFAULT_GATES.map((g) => ({ ...g, isEnabled: gateEnabled(g.id) }));
}
