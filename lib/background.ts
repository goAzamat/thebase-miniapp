import 'server-only';
/**
 * lib/background.ts
 * -------------------------------------------------------------
 * Fire-and-forget background execution that survives after the HTTP response
 * is sent. On Vercel this uses `waitUntil()` to keep the function instance
 * alive until the task settles; anywhere else it degrades to a detached
 * promise. Node runtime only — never import from the Edge graph.
 */
import { waitUntil } from '@vercel/functions';

/**
 * Schedule a promise to run in the background. The handler can return its
 * response immediately; the task keeps running. Errors are always swallowed
 * here (the caller is expected to record failures in its own ledger).
 */
export function scheduleBackground(task: Promise<unknown>): void {
  const safe = Promise.resolve(task).catch((err) => {
    console.error('[background] task rejected:', err);
  });

  try {
    // Keeps the Vercel function instance alive until `safe` settles.
    waitUntil(safe);
  } catch {
    // Not running inside a Vercel request context → detached execution.
    void safe;
  }
}
