'use client';
/**
 * components/modules/lab/formula-detail-view.tsx
 * -------------------------------------------------------------
 * Formula detail — dark "executive" style. Renders:
 *   - action row (Back · Spec sheet → PDF),
 *   - financial overview (live recipe cost, Odoo cost, target cost/serving bar),
 *   - ingredient matrix (dose, cost-contribution bars, supply-status badges,
 *     cheaper-alternative fallback for deficits).
 * Data comes from the hydrated React Query cache (useFormulaDetail).
 */
import { useTranslations } from 'next-intl';
import { ArrowLeft, FileDown, AlertCircle, FlaskConical, CheckCircle2, XCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useFormulaDetail } from '@/features/lab/queries';
import type { FormulaDetail } from '@/features/lab/schema';

// Placeholder target — will later come from the client brief / pricing copilot.
const TARGET_COST_PER_SERVING = 1.5;

const aed = (n: number) =>
  n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function buildSpecHtml(d: FormulaDetail): string {
  const rows = d.ingredients
    .map(
      (i) =>
        `<tr><td>${i.name}</td><td>${i.type}</td><td style="text-align:right">${i.qty} g</td><td style="text-align:right">${i.costPct.toFixed(0)}%</td></tr>`,
    )
    .join('');
  return `<html><head><meta charset="utf-8"><title>${d.code} — ${d.name}</title>
  <style>body{font-family:Georgia,serif;color:#1d1a17;max-width:720px;margin:24px auto;padding:0 20px}
  h1{font-size:22px;border-bottom:2px solid #1d1a17;padding-bottom:8px}h2{font-size:15px;color:#9c6b43;margin-top:20px}
  table{width:100%;border-collapse:collapse;margin-top:8px}td,th{border-bottom:1px solid #e2d8cc;padding:6px 8px;font-size:12.5px;text-align:left}
  th{background:#f4ece1}.kv{display:flex;gap:28px;flex-wrap:wrap;margin-top:8px}.kv b{display:block;font-size:18px}</style></head><body>
  <div style="letter-spacing:3px;font-weight:700">THE BASE</div>
  <h1>${d.name}</h1><div style="color:#7a716a;font-size:12px">${d.code} · ${d.category}</div>
  <h2>Cost</h2><div class="kv">
    <div>Recipe / batch<b>${aed(d.recipeCost)} AED</b></div>
    <div>Cost / serving (${d.servingSize}g)<b>${aed(d.costPerServing)} AED</b></div>
    <div>Odoo cost<b>${aed(d.catalogCost)} AED</b></div>
    <div>Batch weight<b>${d.totalWeight} g</b></div>
  </div>
  <h2>Composition</h2>
  <table><tr><th>Ingredient</th><th>Type</th><th style="text-align:right">Dose</th><th style="text-align:right">% cost</th></tr>${rows}</table>
  <p style="color:#7a716a;font-size:11px;margin-top:10px">Recipe cost = ingredients only. Draft for review.</p>
  </body></html>`;
}

function openSpec(d: FormulaDetail) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(buildSpecHtml(d));
  w.document.close();
  setTimeout(() => w.print(), 350);
}

export function FormulaDetailView({ id }: { id: number }) {
  const t = useTranslations('labDetail');
  const { data, isPending, isError } = useFormulaDetail(id);

  const BackLink = (
    <Link
      href="/lab/formulas"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-400 transition hover:text-amber-300"
    >
      <ArrowLeft className="h-4 w-4" />
      {t('back')}
    </Link>
  );

  if (isPending) {
    return (
      <section className="rounded-2xl bg-[#15110d] p-6 text-[#e9e0d3]">
        {BackLink}
        <div className="mt-5 h-24 animate-pulse rounded-xl bg-[#211a13]" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-[#1c160f]" />
          ))}
        </div>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="rounded-2xl bg-[#15110d] p-6 text-[#e9e0d3]">
        {BackLink}
        <div className="mt-5 flex flex-col items-center justify-center py-14 text-center">
          {isError ? (
            <AlertCircle className="mb-3 h-8 w-8 text-red-400" />
          ) : (
            <FlaskConical className="mb-3 h-8 w-8 text-[#6b5d4c]" />
          )}
          <p className="text-sm text-[#9a8a78]">{isError ? t('error') : t('notFound')}</p>
        </div>
      </section>
    );
  }

  const maxPct = Math.max(...data.ingredients.map((i) => i.costPct), 1);
  const targetPct = Math.min(100, (data.costPerServing / TARGET_COST_PER_SERVING) * 100);
  const underTarget = data.costPerServing <= TARGET_COST_PER_SERVING;

  return (
    <section className="rounded-2xl bg-[#15110d] p-5 text-[#e9e0d3] sm:p-7">
      {/* Action row */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {BackLink}
        <button
          onClick={() => openSpec(data)}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
        >
          <FileDown className="h-4 w-4" />
          {t('specSheet')}
        </button>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="text-[11px] tracking-wide text-[#9a8a78]">{data.code}</div>
        <h1 className="font-serif text-2xl text-[#f4ece1]">{data.name}</h1>
        <span className="mt-1.5 inline-block rounded-full border border-[#3a2f25] bg-[#211a13] px-2.5 py-0.5 text-[11px] text-[#bcae9b]">
          {data.category}
        </span>
      </div>

      {/* Financial overview */}
      <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#2e2620] bg-[#1c150f] p-4">
          <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-[#9a8a78]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {t('recipeCost')}
          </div>
          <div className="font-serif text-2xl font-bold text-[#f4ece1]">{aed(data.recipeCost)}</div>
          <div className="text-[11px] text-[#7a6e60]">AED / batch · {data.totalWeight} g</div>
        </div>

        <div className="rounded-xl border border-[#2e2620] bg-[#1c150f] p-4">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-[#9a8a78]">{t('odooCost')}</div>
          <div className="font-serif text-2xl font-bold text-[#f4ece1]">{aed(data.catalogCost)}</div>
          <div className="text-[11px] text-[#7a6e60]">AED / batch</div>
        </div>

        <div className="rounded-xl border border-[#2e2620] bg-[#1c150f] p-4">
          <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-[#9a8a78]">
            <span>{t('target')}</span>
            <span className={underTarget ? 'text-emerald-400' : 'text-red-400'}>
              {underTarget ? '✓' : '!'}
            </span>
          </div>
          <div className="font-serif text-2xl font-bold text-[#f4ece1]">
            {aed(data.costPerServing)}
            <span className="ms-1 text-xs font-normal text-[#7a6e60]">
              / {t('perServing', { g: data.servingSize })}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#2a221a]">
            <div
              className={`h-full rounded-full ${underTarget ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: `${Math.max(4, targetPct)}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-[#7a6e60]">
            {t('target')}: {aed(TARGET_COST_PER_SERVING)} AED
          </div>
        </div>
      </div>

      {/* Ingredient matrix */}
      <h2 className="mb-3 font-serif text-lg text-[#f4ece1]">
        {t('composition')}{' '}
        <span className="text-sm font-normal text-[#9a8a78]">({data.ingredients.length})</span>
      </h2>

      <div className="overflow-hidden rounded-xl border border-[#2e2620]">
        <div className="hidden grid-cols-[1.6fr_0.8fr_0.6fr_1.4fr_0.9fr] gap-3 bg-[#1c150f] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#7a6e60] sm:grid">
          <div>{t('name')}</div>
          <div>{t('type')}</div>
          <div className="text-right">{t('dose')}</div>
          <div>{t('contribution')}</div>
          <div className="text-right">{t('supply')}</div>
        </div>

        {data.ingredients.map((ing, idx) => (
          <div
            key={`${ing.id}-${idx}`}
            className="grid grid-cols-2 gap-3 border-t border-[#241d16] px-4 py-3 text-sm sm:grid-cols-[1.6fr_0.8fr_0.6fr_1.4fr_0.9fr] sm:items-center"
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-[#ece3d6]">{ing.name}</div>
              <div className="text-[11px] text-[#7a6e60] sm:hidden">{ing.type}</div>
            </div>

            <div className="hidden text-[12px] text-[#bcae9b] sm:block">{ing.type}</div>

            <div className="text-right text-[12px] tabular-nums text-[#bcae9b]">{ing.qty} g</div>

            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2a221a]">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${Math.max(4, (ing.costPct / maxPct) * 100)}%` }}
                  />
                </div>
                <span className="w-16 text-right text-[12px] font-semibold tabular-nums text-[#ece3d6]">
                  {aed(ing.cost)}
                </span>
                <span className="w-9 text-right text-[11px] text-[#7a6e60]">
                  {ing.costPct.toFixed(0)}%
                </span>
              </div>
              {!ing.inStock && (
                <div className="mt-1 text-[11px] text-amber-400/90">
                  ↳ {ing.alternatives[0]?.name ?? t('altPlaceholder')}
                  {ing.alternatives[0] ? ` (${aed(ing.alternatives[0].cost)}/kg)` : ''}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end">
              {ing.inStock ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('inStock')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">
                  <XCircle className="h-3.5 w-3.5" />
                  {t('deficit')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
