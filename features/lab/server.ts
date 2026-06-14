'use server';
/**
 * features/lab/server.ts
 * -------------------------------------------------------------
 * Lab data access (server-only Server Actions, callable from RSC + client).
 * Every read goes through `serviceSearchRead` (shared service account) and is
 * wrapped in `unstable_cache` (Tier-A shared cache: TTL + tags).
 *
 * IMPORTANT: calls to Odoo are AWAITED SEQUENTIALLY — the XML-RPC connection
 * is single-flight, so parallel calls would collide (CannotSendRequest).
 */
import { unstable_cache } from 'next/cache';
import { serviceSearchRead } from '@/lib/odoo/auth';
import {
  mapTask,
  buildFormulas,
  LAB_BRIEF_FIELDS,
  type RawTask,
  type RawBom,
  type RawBomLine,
  type RawFinished,
  type RawPrice,
  type LabBrief,
  type Formula,
} from './schema';

/* ------------------------------ BRIEFS ------------------------------ */

const BRIEFS_DOMAIN: unknown[] = [['active', '=', true]];

const fetchBriefsCached = unstable_cache(
  async (): Promise<LabBrief[]> => {
    const rows = await serviceSearchRead<RawTask>('project.task', BRIEFS_DOMAIN, [...LAB_BRIEF_FIELDS], {
      limit: 100,
      order: 'priority desc, date_deadline asc',
    });
    return rows.map(mapTask);
  },
  ['lab', 'briefs'],
  { revalidate: 120, tags: ['odoo:project.task', 'lab:briefs'] },
);

export async function getLabBriefs(): Promise<LabBrief[]> {
  return fetchBriefsCached();
}

/* ------------------------------ FORMULAS ------------------------------ */

const fetchFormulasCached = unstable_cache(
  async (): Promise<Formula[]> => {
    // 1) Bills of Materials (the recipes).
    const boms = await serviceSearchRead<RawBom>(
      'mrp.bom',
      [],
      ['product_tmpl_id', 'product_qty', 'code'],
      { limit: 2000 },
    );

    // 2) Finished products → cost / price / category / stock.
    const tmplIds = [
      ...new Set(boms.map((b) => (b.product_tmpl_id ? b.product_tmpl_id[0] : null)).filter(Boolean)),
    ];
    const finished = await serviceSearchRead<RawFinished>(
      'product.template',
      [['id', 'in', tmplIds]],
      ['default_code', 'name', 'standard_price', 'list_price', 'categ_id', 'qty_available'],
      { limit: 5000 },
    );

    // 3) BOM lines (ingredient rows) for all recipes.
    const bomIds = boms.map((b) => b.id);
    const lines = await serviceSearchRead<RawBomLine>(
      'mrp.bom.line',
      [['bom_id', 'in', bomIds]],
      ['bom_id', 'product_id', 'product_uom_id', 'product_qty'],
      { limit: 10000 },
    );

    // 4) Raw-material costs (product.product, since BOM lines reference variants).
    const rawIds = [
      ...new Set(lines.map((l) => (l.product_id ? l.product_id[0] : null)).filter(Boolean)),
    ];
    const rawPrices = await serviceSearchRead<RawPrice>(
      'product.product',
      [['id', 'in', rawIds]],
      ['standard_price'],
      { limit: 10000 },
    );

    // 5) Heavy compute happens here on the server; client gets clean data.
    return buildFormulas(boms, finished, lines, rawPrices);
  },
  ['lab', 'formulas'],
  { revalidate: 900, tags: ['odoo:mrp.bom', 'odoo:product.template', 'lab:formulas'] },
);

/** Public Server Action: fetch the formula library with computed costs. */
export async function getFormulas(): Promise<Formula[]> {
  return fetchFormulasCached();
}
