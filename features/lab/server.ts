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
  buildFormulaDetail,
  mapIngredient,
  LAB_BRIEF_FIELDS,
  type RawTask,
  type RawBom,
  type RawBomLine,
  type RawFinished,
  type RawPrice,
  type RawProduct,
  type RawIngredient,
  type LabBrief,
  type Formula,
  type FormulaDetail,
  type Ingredient,
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

/* --------------------------- FORMULA DETAIL --------------------------- */

// `unstable_cache` includes the function arguments (id) in the cache key,
// so each formula is cached independently.
const fetchFormulaDetailCached = unstable_cache(
  async (id: number): Promise<FormulaDetail | null> => {
    // 1) Latest BOM revision for this finished product.
    const boms = await serviceSearchRead<{ id: number }>(
      'mrp.bom',
      [['product_tmpl_id', '=', id]],
      ['id'],
      { limit: 1, order: 'id desc' },
    );
    if (boms.length === 0) return null;
    const bomId = boms[0].id;

    // 2) The finished product (cost / price / stock).
    const finishedRows = await serviceSearchRead<RawFinished>(
      'product.template',
      [['id', '=', id]],
      ['default_code', 'name', 'standard_price', 'list_price', 'categ_id', 'qty_available'],
      { limit: 1 },
    );
    if (finishedRows.length === 0) return null;

    // 3) Ingredient lines.
    const lines = await serviceSearchRead<RawBomLine>(
      'mrp.bom.line',
      [['bom_id', '=', bomId]],
      ['bom_id', 'product_id', 'product_uom_id', 'product_qty'],
      { limit: 500 },
    );

    // 4) Ingredient products (name, cost, category, stock).
    const rawIds = [
      ...new Set(lines.map((l) => (l.product_id ? l.product_id[0] : null)).filter(Boolean)),
    ];
    const raws = await serviceSearchRead<RawProduct>(
      'product.product',
      [['id', 'in', rawIds]],
      ['name', 'default_code', 'standard_price', 'categ_id', 'qty_available'],
      { limit: 1000 },
    );

    // 5) Cheaper-alternative candidates: same categories, in stock, priced.
    const catIds = [
      ...new Set(raws.map((r) => (r.categ_id ? r.categ_id[0] : null)).filter(Boolean)),
    ];
    const alts = catIds.length
      ? await serviceSearchRead<RawProduct>(
          'product.product',
          [
            ['categ_id', 'in', catIds],
            ['qty_available', '>', 0],
            ['standard_price', '>', 0],
          ],
          ['name', 'default_code', 'standard_price', 'categ_id', 'qty_available'],
          { limit: 800 },
        )
      : [];

    return buildFormulaDetail(finishedRows[0], lines, raws, alts);
  },
  ['lab', 'formula-detail'],
  { revalidate: 900, tags: ['odoo:mrp.bom', 'odoo:product.product', 'lab:formulas'] },
);

/** Public Server Action: full ingredient breakdown for a single formula. */
export async function getFormulaDetails(id: number): Promise<FormulaDetail | null> {
  return fetchFormulaDetailCached(id);
}

/* ----------------------------- INGREDIENTS ----------------------------- */

const fetchIngredientsCached = unstable_cache(
  async (): Promise<Ingredient[]> => {
    // 1) Resolve all "Raw Material" categories by their complete_name.
    const cats = await serviceSearchRead<{ id: number }>(
      'product.category',
      [['complete_name', 'like', 'Raw Material']],
      ['id'],
      { limit: 200 },
    );
    const catIds = cats.map((c) => c.id);
    if (catIds.length === 0) return [];

    // 2) Raw-material products with a real cost.
    const rows = await serviceSearchRead<RawIngredient>(
      'product.template',
      [
        ['categ_id', 'in', catIds],
        ['standard_price', '>', 0],
      ],
      ['default_code', 'name', 'standard_price', 'categ_id', 'qty_available'],
      { limit: 3000, order: 'name asc' },
    );
    return rows.map(mapIngredient);
  },
  ['lab', 'ingredients'],
  { revalidate: 900, tags: ['odoo:product.template', 'lab:ingredients'] },
);

/** Public Server Action: raw-material catalog with cost/kg and stock. */
export async function getIngredients(): Promise<Ingredient[]> {
  return fetchIngredientsCached();
}
