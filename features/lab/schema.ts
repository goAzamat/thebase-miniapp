/**
 * features/lab/schema.ts
 * -------------------------------------------------------------
 * Types + PURE mappers for the Lab module (no 'use server', so both the
 * server action and the client hook can import the types safely).
 *
 * Two datasets:
 *   - Client Briefs  (project.task)  → LabBrief
 *   - Formulas       (mrp.bom + products) → Formula  (cost computed server-side)
 */

/* ----------------------------- BRIEFS ----------------------------- */

export interface RawTask {
  id: number;
  name: string;
  stage_id: [number, string] | false;
  date_deadline: string | false;
  user_id: [number, string] | false;
  priority: string;
}

export interface LabBrief {
  id: number;
  name: string;
  stage: string | null;
  stageId: number | null;
  deadline: string | null;
  owner: string | null;
  priority: 'high' | 'normal';
}

export const LAB_BRIEF_FIELDS = ['name', 'stage_id', 'date_deadline', 'user_id', 'priority'] as const;

export function mapTask(r: RawTask): LabBrief {
  return {
    id: r.id,
    name: r.name,
    stage: r.stage_id ? r.stage_id[1] : null,
    stageId: r.stage_id ? r.stage_id[0] : null,
    deadline: r.date_deadline || null,
    owner: r.user_id ? r.user_id[1] : null,
    priority: r.priority && r.priority !== '0' ? 'high' : 'normal',
  };
}

/* ----------------------------- FORMULAS ----------------------------- */

export interface RawBom {
  id: number;
  product_tmpl_id: [number, string] | false;
  product_qty: number;
  code: string | false;
}

export interface RawBomLine {
  id: number;
  bom_id: [number, string] | false;
  product_id: [number, string] | false;
  product_uom_id: [number, string] | false;
  product_qty: number;
}

export interface RawFinished {
  id: number;
  default_code: string | false;
  name: string;
  standard_price: number;
  list_price: number;
  categ_id: [number, string] | false;
  qty_available: number;
}

export interface RawPrice {
  id: number;
  standard_price: number;
}

/** Clean, fully-computed view-model the frontend receives. */
export interface Formula {
  id: number; // product.template id
  code: string;
  name: string;
  category: string;
  catalogCost: number; // product.standard_price (incl. packaging + overhead)
  recipeCost: number; // computed from BOM lines — ingredients only
  price: number; // list_price
  stock: number; // qty_available
  inStock: boolean;
}

/** Strip an embedded "[CODE] " or "id, " prefix from an Odoo display name. */
export function stripCode(s: string): string {
  return s.replace(/^\[[^\]]*\]\s*/, '').replace(/^\d+,\s*/, '').trim();
}

/**
 * THE HEAVY LIFTING (server-side): join BOMs ↔ finished products ↔ lines ↔
 * raw-material prices and compute each formula's recipe cost. The client
 * only ever receives the finished `Formula[]` — no joins on the frontend.
 */
export function buildFormulas(
  boms: RawBom[],
  finished: RawFinished[],
  lines: RawBomLine[],
  rawPrices: RawPrice[],
): Formula[] {
  // Latest BOM revision per finished product (highest id wins).
  const bomByTmpl = new Map<number, RawBom>();
  for (const b of boms) {
    const tmpl = b.product_tmpl_id ? b.product_tmpl_id[0] : null;
    if (tmpl == null) continue;
    const prev = bomByTmpl.get(tmpl);
    if (!prev || b.id > prev.id) bomByTmpl.set(tmpl, b);
  }

  const priceById = new Map(rawPrices.map((r) => [r.id, r.standard_price]));
  const finById = new Map(finished.map((f) => [f.id, f]));

  const linesByBom = new Map<number, RawBomLine[]>();
  for (const l of lines) {
    const bom = l.bom_id ? l.bom_id[0] : null;
    if (bom == null) continue;
    const arr = linesByBom.get(bom);
    if (arr) arr.push(l);
    else linesByBom.set(bom, [l]);
  }

  const out: Formula[] = [];
  for (const [tmplId, bom] of bomByTmpl) {
    const f = finById.get(tmplId);
    if (!f || !f.default_code || !(f.standard_price > 0)) continue;

    const categ = f.categ_id ? f.categ_id[1] : '';
    if (!categ.startsWith('Finished Goods')) continue;

    let recipe = 0;
    for (const l of linesByBom.get(bom.id) ?? []) {
      const uom = l.product_uom_id ? l.product_uom_id[1] : '';
      const pid = l.product_id ? l.product_id[0] : null;
      const price = pid != null ? priceById.get(pid) ?? 0 : 0;
      if (uom === 'g') recipe += (l.product_qty / 1000) * price;
      else if (uom === 'kg') recipe += l.product_qty * price;
    }

    out.push({
      id: tmplId,
      code: f.default_code,
      name: stripCode(f.name),
      category: categ.split('/').slice(1).join(' / ').trim() || 'Other',
      catalogCost: f.standard_price,
      recipeCost: Math.round(recipe * 1000) / 1000,
      price: f.list_price,
      stock: f.qty_available,
      inStock: f.qty_available > 0,
    });
  }

  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
