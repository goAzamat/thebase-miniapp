'use client';
/**
 * components/modules/lab/formula-detail-view.tsx
 * -------------------------------------------------------------
 * Detailed recipe breakdown for one formula (recreated from the MVP):
 *   - top cost summary (Recipe cost / Odoo cost / Sale price),
 *   - per-ingredient cost-contribution bars,
 *   - cheaper in-stock alternatives per ingredient.
 * Premium + responsive. Data comes from the hydrated React Query cache.
 */
import { useTranslations } from 'next-intl';
import { ArrowLeft, AlertCircle, FlaskConical } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useFormulaDetail } from '@/features/lab/queries';

const aed = (n: number) =>
  n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function FormulaDetailView({ id }: { id: number }) {
  const t = useTranslations('labDetail');
  const { data, isPending, isError } = useFormulaDetail(id);

  const BackLink = (
    <Link
      href="/lab/formulas"
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#9c6b43] transition hover:text-[#7d5331]"
    >
      <ArrowLeft className="h-4 w-4" />
      {t('back')}
    </Link>
  );

  if (isPending) {
    return (
      <section>
        {BackLink}
        <div className="h-24 animate-pulse rounded-xl border border-[#e7ded3] bg-white" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-white" />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section>
        {BackLink}
        <div className="flex items-center gap-2 rounded-xl border border-[#e3b9ac] bg-[#f8eee9] px-4 py-3 text-sm text-[#b5462f]">
          <AlertCircle className="h-4 w-4" />
          {t('error')}
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section>
        {BackLink}
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#ddd0bf] bg-white/60 py-16 text-center">
          <FlaskConical className="mb-3 h-8 w-8 text-[#c3b4a1]" />
          <p className="text-sm text-[#7a716a]">{t('notFound')}</p>
        </div>
      </section>
    );
  }

  const maxCost = Math.max(...data.ingredients.map((i) => i.cost), 0.0001);

  const summary = [
    { label: t('recipeCost'), value: aed(data.recipeCost), accent: 'text-[#1d1a17]' },
    { label: t('odooCost'), value: aed(data.catalogCost), accent: 'text-[#1d1a17]' },
    { label: t('salePrice'), value: aed(data.price), accent: 'text-[#1d1a17]' },
  ];

  return (
    <section>
      {BackLink}

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] tracking-wide text-[#9a8a78]">{data.code}</div>
          <h1 className="font-serif text-2xl text-[#1d1a17]">{data.name}</h1>
          <span className="mt-1 inline-block rounded-full bg-[#f0e8dd] px-2.5 py-0.5 text-[11px] text-[#6a5f54]">
            {data.category}
          </span>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            data.inStock ? 'bg-[#e7f1eb] text-[#2f7d5b]' : 'bg-[#f6e4df] text-[#b5462f]'
          }`}
        >
          {data.inStock ? t('inStock') : t('outOfStock')}
        </span>
      </div>

      {/* Cost summary bar */}
      <div className="mb-2 flex flex-wrap gap-5 rounded-xl border border-[#e7ded3] bg-white px-5 py-4">
        {summary.map((s) => (
          <div key={s.label}>
            <div className={`font-serif text-xl font-bold ${s.accent}`}>{s.value}</div>
            <div className="text-[11px] text-[#9a8a78]">{s.label} · AED</div>
          </div>
        ))}
      </div>
      <p className="mb-5 text-xs text-[#9a8a78]">{t('note')}</p>

      {/* Ingredient breakdown */}
      <h2 className="mb-3 font-serif text-lg text-[#1d1a17]">
        {t('composition')}{' '}
        <span className="text-sm font-normal text-[#9a8a78]">
          ({data.ingredients.length})
        </span>
      </h2>

      <div className="overflow-hidden rounded-xl border border-[#e7ded3] bg-white">
        {data.ingredients.map((ing, idx) => (
          <div
            key={`${ing.id}-${idx}`}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-[#f0e8dd] px-4 py-3 last:border-b-0"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-[#1d1a17]">{ing.name}</span>
                {!ing.inStock && (
                  <span className="shrink-0 rounded-full bg-[#f6e4df] px-1.5 py-0.5 text-[10px] font-semibold text-[#b5462f]">
                    {t('outOfStock')}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#9a8a78]">{ing.type}</div>
              <div className="mt-1.5 h-1.5 max-w-xs overflow-hidden rounded-full bg-[#f1e8db]">
                <div
                  className="h-full rounded-full bg-[#9c6b43]"
                  style={{ width: `${Math.max(4, (ing.cost / maxCost) * 100)}%` }}
                />
              </div>
              {ing.alternatives.length > 0 && (
                <div className="mt-1.5 text-[11px] text-[#2f5d50]">
                  ↳ {t('cheaper')}{' '}
                  {ing.alternatives.map((a) => `${a.name} (${aed(a.cost)}/kg)`).join(', ')}
                </div>
              )}
            </div>

            <div className="whitespace-nowrap text-right text-xs text-[#9a8a78]">
              {ing.qty} {ing.uom}
            </div>

            <div className="whitespace-nowrap text-right">
              <div className="text-sm font-bold tabular-nums text-[#1d1a17]">{aed(ing.cost)}</div>
              <div className="text-[11px] text-[#9a8a78]">{ing.costPct.toFixed(0)}%</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
