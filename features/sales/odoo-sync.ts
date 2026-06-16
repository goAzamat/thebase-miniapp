import 'server-only';
/**
 * features/sales/odoo-sync.ts
 * -------------------------------------------------------------
 * WhatsApp → Odoo CRM ingestion pipeline (SERVER-ONLY, Node/XML-RPC).
 *
 *   - ingestIntakeToOdoo(): upsert res.partner by phone, then create a crm.lead
 *     whose description carries the WhatsApp conversation summary.
 *   - fetchIntakeQueue(): read recently-ingested WhatsApp leads back as the DMS
 *     queue (graceful fallback to the seed list while the channel warms up).
 *   - setIntakeParsing(): flip a lead from "Unparsed" → "Parsing".
 *
 * Credentials come from the service account (process.env.ODOO_API_KEY). This
 * module never reaches the Edge runtime (imports xmlrpc via lib/odoo/client).
 */
import { commonCall, executeKw, OdooError } from '@/lib/odoo/client';
import { INTAKE_QUEUE, type IntakeItem, type RndStatus } from './schema';

const ODOO_DB = process.env.ODOO_DB ?? '';
const ODOO_USERNAME = process.env.ODOO_USERNAME ?? '';
const ODOO_API_KEY = process.env.ODOO_API_KEY ?? '';

const INTAKE_MARKER = '[WA-INTAKE]';
const PARSING_MARKER = '[PARSING]';

export interface IngestResult {
  partnerId: number;
  leadId: number;
  created: boolean; // whether a new partner was created
}

/* ---------------------------- service auth --------------------------- */

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

function exec<T>(uid: number, model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) {
  return executeKw<T>(uid, ODOO_API_KEY, model, method, args, kwargs);
}

/* ------------------------------ helpers ------------------------------ */

/** Keep digits; the trailing 9 digits are used for fuzzy partner matching. */
function normalizePhone(raw: string): string {
  const digits = (raw.match(/\d+/g) ?? []).join('');
  return digits;
}

function statusFromLead(description: string, stageName: string | false): RndStatus {
  if (description.includes(PARSING_MARKER)) return 'parsing';
  const s = (stageName || '').toLowerCase();
  if (/won|quote/.test(s)) return 'quoted';
  if (/propos/.test(s)) return 'calculated';
  if (/qualif/.test(s)) return 'parsing';
  return 'unparsed';
}

/* --------------------------- ingestion ------------------------------- */

export async function ingestIntakeToOdoo(intake: IntakeItem): Promise<IngestResult> {
  const uid = await getUid();
  const phone = normalizePhone(intake.phone ?? intake.sender);

  // 1) Find an existing partner by phone or mobile (fuzzy on trailing digits).
  let partnerId: number | undefined;
  let created = false;
  if (phone) {
    const tail = phone.slice(-9);
    const found = await exec<number[]>('res.partner', 'search', [[
      '|',
      ['phone', 'ilike', tail],
      ['mobile', 'ilike', tail],
    ]], { limit: 1 });
    partnerId = found[0];
  }

  // 2) Create the partner if none matched.
  if (!partnerId) {
    partnerId = await exec<number>('res.partner', 'create', [{
      name: intake.sender || `WhatsApp ${phone || 'lead'}`,
      phone: phone ? `+${phone}` : false,
      company_type: 'company',
      comment: `Auto-created from WhatsApp intake (${intake.id}).`,
    }]);
    created = true;
  }

  // 3) Create the opportunity, summary in the description.
  const leadId = await exec<number>('crm.lead', 'create', [{
    name: `WhatsApp · ${intake.sender || phone}`,
    partner_id: partnerId,
    contact_name: intake.sender || undefined,
    phone: phone ? `+${phone}` : undefined,
    type: 'opportunity',
    description: `${INTAKE_MARKER} ${intake.snippet}\n\nReceived: ${intake.ts}\nMessage id: ${intake.id}`,
  }]);

  return { partnerId, leadId, created };
}

/* --------------------------- read-back ------------------------------- */

export async function fetchIntakeQueue(): Promise<IntakeItem[]> {
  try {
    const uid = await getUid();
    const rows = await exec<
      Array<{
        id: number;
        contact_name: string | false;
        phone: string | false;
        description: string | false;
        create_date: string;
        stage_id: [number, string] | false;
      }>
    >('crm.lead', 'search_read', [[['description', 'ilike', INTAKE_MARKER]]], {
      fields: ['contact_name', 'phone', 'description', 'create_date', 'stage_id'],
      limit: 20,
      order: 'create_date desc',
    });

    if (rows.length === 0) return INTAKE_QUEUE; // channel warming up → seed view

    return rows.map((r) => {
      const desc = r.description || '';
      return {
        id: `lead-${r.id}`,
        leadId: r.id,
        ts: new Date(r.create_date.replace(' ', 'T') + 'Z').toISOString(),
        sender: r.contact_name || r.phone || 'WhatsApp lead',
        phone: r.phone || undefined,
        snippet: desc.replace(INTAKE_MARKER, '').replace(PARSING_MARKER, '').split('\n')[0].trim(),
        rndStatus: statusFromLead(desc, r.stage_id ? r.stage_id[1] : false),
      } satisfies IntakeItem;
    });
  } catch {
    // Never break the dashboard on an Odoo hiccup — fall back to the seed list.
    return INTAKE_QUEUE;
  }
}

/** Shift a lead from Unparsed → Parsing by tagging its description. */
export async function setIntakeParsing(leadId: number): Promise<boolean> {
  if (!Number.isFinite(leadId) || leadId <= 0) return false;
  try {
    const uid = await getUid();
    const [lead] = await exec<Array<{ description: string | false }>>(
      'crm.lead',
      'read',
      [[leadId], ['description']],
    );
    const desc = lead?.description || '';
    if (desc.includes(PARSING_MARKER)) return true;
    await exec<boolean>('crm.lead', 'write', [[leadId], { description: `${PARSING_MARKER} ${desc}` }]);
    return true;
  } catch {
    return false;
  }
}
