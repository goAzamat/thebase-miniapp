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

/* -------------------------- FORMULA DETAIL -------------------------- */

export interface RawProduct {
  id: number;
  name: string;
  default_code: string | false;
  standard_price: number;
  categ_id: [number, string] | false;
  qty_available: number;
}

export interface IngredientAlt {
  name: string;
  cost: number;
}

export interface IngredientLine {
  id: number;
  name: string;
  type: string; // raw-material sub-category, e.g. "Flavour"
  qty: number;
  uom: string;
  cost: number;
  costPct: number; // share of total recipe cost
  weightPct: number; // share of total batch weight
  inStock: boolean;
  alternatives: IngredientAlt[]; // cheaper, in-stock, same category
}

export interface FormulaDetail {
  id: number;
  code: string;
  name: string;
  category: string;
  catalogCost: number;
  recipeCost: number;
  price: number;
  stock: number;
  inStock: boolean;
  ingredients: IngredientLine[];
}

/** "Raw Material / Flavour Raw Material" → "Flavour". */
export function rawSub(cat: string): string {
  const parts = cat.split('/').map((s) => s.trim());
  const s = parts[1] || 'Main';
  return s.replace(/Raw Material/gi, '').replace(/-/g, '').trim() || 'Main';
}

/**
 * Build the full ingredient breakdown for one formula, with per-ingredient
 * cost/weight shares and cheaper same-category alternatives that are in stock.
 * All heavy work stays server-side; the client receives a ready FormulaDetail.
 */
export function buildFormulaDetail(
  finished: RawFinished,
  lines: RawBomLine[],
  raws: RawProduct[],
  alts: RawProduct[],
): FormulaDetail {
  const rawById = new Map(raws.map((r) => [r.id, r]));

  const altByCat = new Map<number, RawProduct[]>();
  for (const a of alts) {
    const c = a.categ_id ? a.categ_id[0] : null;
    if (c == null) continue;
    const arr = altByCat.get(c);
    if (arr) arr.push(a);
    else altByCat.set(c, [a]);
  }

  type Mid = {
    pid: number | null;
    raw?: RawProduct;
    uom: string;
    qty: number;
    g: number;
    cost: number;
    catId: number | null;
    cat: string;
  };

  let totalWeight = 0;
  let totalCost = 0;

  const mids: Mid[] = lines.map((l) => {
    const pid = l.product_id ? l.product_id[0] : null;
    const raw = pid != null ? rawById.get(pid) : undefined;
    const uom = l.product_uom_id ? l.product_uom_id[1] : '';
    const price = raw ? raw.standard_price : 0;
    let g = 0;
    let cost = 0;
    if (uom === 'g') {
      g = l.product_qty;
      cost = (l.product_qty / 1000) * price;
    } else if (uom === 'kg') {
      g = l.product_qty * 1000;
      cost = l.product_qty * price;
    }
    totalWeight += g;
    totalCost += cost;
    return {
      pid,
      raw,
      uom,
      qty: l.product_qty,
      g,
      cost,
      catId: raw && raw.categ_id ? raw.categ_id[0] : null,
      cat: raw && raw.categ_id ? raw.categ_id[1] : '',
    };
  });

  const ingredients: IngredientLine[] = mids
    .map((m) => {
      const costPct = totalCost > 0 ? (m.cost / totalCost) * 100 : 0;
      const weightPct = totalWeight > 0 ? (m.g / totalWeight) * 100 : 0;
      const price = m.raw ? m.raw.standard_price : 0;

      let alternatives: IngredientAlt[] = [];
      if (m.catId != null && m.cost > 0) {
        alternatives = (altByCat.get(m.catId) ?? [])
          .filter((a) => a.id !== m.pid && a.standard_price < price)
          .sort((x, y) => x.standard_price - y.standard_price)
          .slice(0, 2)
          .map((a) => ({ name: stripCode(a.name), cost: a.standard_price }));
      }

      return {
        id: m.pid ?? 0,
        name: m.raw ? stripCode(m.raw.name) : '—',
        type: rawSub(m.cat),
        qty: m.qty,
        uom: m.uom,
        cost: Math.round(m.cost * 1000) / 1000,
        costPct,
        weightPct,
        inStock: m.raw ? m.raw.qty_available > 0 : false,
        alternatives,
      };
    })
    .sort((a, b) => b.cost - a.cost);

  const categ = finished.categ_id ? finished.categ_id[1] : '';
  return {
    id: finished.id,
    code: finished.default_code || '',
    name: stripCode(finished.name),
    category: categ.split('/').slice(1).join(' / ').trim() || 'Other',
    catalogCost: finished.standard_price,
    recipeCost: Math.round(totalCost * 1000) / 1000,
    price: finished.list_price,
    stock: finished.qty_available,
    inStock: finished.qty_available > 0,
    ingredients,
  };
}

/* ----------------------------- INGREDIENTS ----------------------------- */

export interface RawIngredient {
  id: number;
  default_code: string | false;
  name: string;
  standard_price: number;
  categ_id: [number, string] | false;
  qty_available: number;
}

export interface Ingredient {
  id: number;
  code: string;
  name: string;
  type: string; // raw-material sub-category, e.g. "Flavour"
  cost: number; // AED / kg
  stock: number; // kg
  inStock: boolean;
}

export function mapIngredient(r: RawIngredient): Ingredient {
  const cat = r.categ_id ? r.categ_id[1] : '';
  return {
    id: r.id,
    code: r.default_code || '',
    name: stripCode(r.name),
    type: rawSub(cat),
    cost: r.standard_price,
    stock: r.qty_available,
    inStock: r.qty_available > 0,
  };
}
