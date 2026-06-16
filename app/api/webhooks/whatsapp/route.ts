/**
 * app/api/webhooks/whatsapp/route.ts
 * -------------------------------------------------------------
 * WhatsApp Business API webhook (Meta Cloud API).
 *   - GET  : verification handshake (hub.challenge echo).
 *   - POST : capture inbound messages → ingest into Odoo CRM.
 *
 * Node.js runtime — it imports the XML-RPC ingestion pipeline, which must not
 * be bundled for the Edge runtime.
 *
 * Security:
 *   - GET verified against process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN.
 *   - POST optionally HMAC-verified against process.env.WHATSAPP_APP_SECRET
 *     (X-Hub-Signature-256). If no secret is configured, signature is skipped.
 */
import crypto from 'node:crypto';
import { ingestIntakeToOdoo } from '@/features/sales/odoo-sync';
import { claimMessage, markProcessed, markFailed } from '@/features/sales/idempotency';
import { scheduleBackground } from '@/lib/background';
import type { IntakeItem } from '@/features/sales/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* --------------------------- Meta payload --------------------------- */

interface WaContact {
  profile?: { name?: string };
  wa_id: string;
}
interface WaMessage {
  id: string;
  from: string;
  timestamp: string; // unix seconds
  type: string;
  text?: { body: string };
  document?: { filename?: string; caption?: string };
  image?: { caption?: string };
}
interface WaValue {
  contacts?: WaContact[];
  messages?: WaMessage[];
}
interface WaWebhook {
  object?: string;
  entry?: Array<{ changes?: Array<{ value?: WaValue }> }>;
}

/* ------------------------------ GET --------------------------------- */

export function GET(req: Request): Response {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge') ?? '';

  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

/* --------------------------- signature ------------------------------ */

function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // not configured → skip (dev)
  if (!header) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

/* ------------------------------ POST -------------------------------- */

function toIntake(msg: WaMessage, contacts: WaContact[]): IntakeItem {
  const contact = contacts.find((c) => c.wa_id === msg.from);
  const snippet =
    msg.text?.body ??
    msg.document?.caption ??
    (msg.document?.filename ? `[PDF] ${msg.document.filename}` : undefined) ??
    msg.image?.caption ??
    `[${msg.type}]`;
  return {
    id: msg.id,
    ts: new Date(Number(msg.timestamp) * 1000).toISOString(),
    sender: contact?.profile?.name ?? msg.from,
    phone: msg.from,
    snippet,
    rndStatus: 'unparsed',
  };
}

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();

  if (!verifySignature(rawBody, req.headers.get('x-hub-signature-256'))) {
    return new Response('Invalid signature', { status: 401 });
  }

  let payload: WaWebhook;
  try {
    payload = JSON.parse(rawBody) as WaWebhook;
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  // Collect all inbound messages across entries/changes.
  const intakes: IntakeItem[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages?.length) continue;
      const contacts = value.contacts ?? [];
      for (const msg of value.messages) intakes.push(toIntake(msg, contacts));
    }
  }

  // Idempotent async dispatch: claim each message_id, queue NEW ones to a
  // background worker, and ACK Meta immediately (<3s). Duplicate / concurrent
  // re-deliveries are skipped BEFORE any Odoo call, so no double leads.
  let queued = 0;
  let duplicates = 0;
  for (const intake of intakes) {
    const { firstClaim } = claimMessage(intake.id);
    if (!firstClaim) {
      duplicates += 1;
      continue;
    }
    queued += 1;
    scheduleBackground(processIntake(intake));
  }

  return Response.json({ received: intakes.length, queued, duplicates }, { status: 200 });
}

/**
 * Background worker — runs AFTER the 200 is sent (kept alive by waitUntil on
 * Vercel). Records the outcome in the idempotency ledger for admin auditing.
 */
async function processIntake(intake: IntakeItem): Promise<void> {
  try {
    const res = await ingestIntakeToOdoo(intake);
    markProcessed(intake.id);
    console.info(`[whatsapp-webhook] ingested ${intake.id} → lead ${res.leadId}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    markFailed(intake.id, message);
    console.error(`[whatsapp-webhook] ingest failed ${intake.id}: ${message}`);
  }
}
