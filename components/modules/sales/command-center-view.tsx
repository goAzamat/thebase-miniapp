'use client';
/**
 * components/modules/sales/command-center-view.tsx
 * -------------------------------------------------------------
 * S&OP Command Center — a "Predictive Demand Engine" over the CRM pipeline.
 * Deep-dark (zinc-950) terminal aesthetic with amber accents:
 *   - CEO Insight header bar (weighted forecast, projected volume, capacity runway),
 *   - smart deal cards (recipe context, supply feasibility, recommended OEM plant,
 *     win-probability gradient, Simulate Batch deep-link to the Lab formula).
 */
import { useTranslations } from 'next-intl';
import {
  TrendingUp,
  Factory,
  PackageCheck,
  AlertTriangle,
  FlaskConical,
  Gauge,
  AlertCircle,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useSalesIntel } from '@/features/sales/queries';
import type { SalesDeal, SalesKpis } from '@/features/sales/schema';

const compact = (n: number) =>
  n.toLocaleString('en', { notation: 'compact', maximumFractionDigits: 1 });

function runwayColor(pct: number): string {
  if (pct < 70) return 'bg-emerald-500';
  if (pct < 90) return 'bg-amber-500';
  return 'bg-red-500';
}

function KpiBar({ kpis }: { kpis: SalesKpis }) {
  const t = useTranslations('salesIntel');
  return (
    <div className="mb-6 grid grid-cols-1 divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div className="p-4">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
          <TrendingUp className="h-3.5 w-3.5 text-amber-500" /> {t('weightedForecast')}
        </div>
        <div className="font-mono text-2xl font-bold text-zinc-100">
          {compact(kpis.weightedForecast)} <span className="text-sm text-zinc-500">AED</span>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
          <Factory className="h-3.5 w-3.5 text-amber-500" /> {t('projectedVolume')}
        </div>
        <div className="font-mono text-2xl font-bold text-zinc-100">
          {kpis.projectedVolumeTons} <span className="text-sm text-zinc-500">t</span>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-amber-500" /> {t('capacityRunway')}
          </span>
          <span className="font-mono text-zinc-300">{kpis.runwayPct}%</span>
        </div>
        <div className="mb-1.5 font-mono text-2xl font-bold text-zinc-100">
          {kpis.committedVolumeTons}
          <span className="text-sm text-zinc-500"> / {kpis.capacityTons} t</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full ${runwayColor(kpis.runwayPct)}`}
            style={{ width: `${Math.min(100, Math.max(2, kpis.runwayPct))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function DealCard({ deal }: { deal: SalesDeal }) {
  const t = useTranslations('salesIntel');
  const p = Math.max(0, Math.min(100, deal.probability));
  // Win-probability gradient: amber intensity scales with probability.
  const borderColor = `rgba(245,158,11,${(0.15 + (p / 100) * 0.6).toFixed(2)})`;
  const tint = `rgba(245,158,11,${(0.03 + (p / 100) * 0.05).toFixed(3)})`;

  return (
    <div
      className="rounded-xl border bg-zinc-900 p-4 transition hover:bg-zinc-900/70"
      style={{ borderColor, backgroundImage: `linear-gradient(${tint}, ${tint})` }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-semibold text-zinc-100">{deal.name}</h3>
        <span className="shrink-0 rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
          {deal.stage ?? deal.stageKey}
        </span>
      </div>

      <div className="mb-3 truncate text-xs text-zinc-500">{deal.partner ?? '—'}</div>

      {/* Money row */}
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className="font-mono text-lg font-bold text-zinc-100">
            {compact(deal.revenue)} <span className="text-xs text-zinc-500">AED</span>
          </div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-600">
            {t('weighted')}: {compact(deal.weightedRevenue)}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-bold text-amber-500">{p}%</div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-600">{t('probability')}</div>
        </div>
      </div>

      {/* Recipe context */}
      <div className="mb-2 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-2.5 py-1.5">
        <FlaskConical className="h-3.5 w-3.5 text-amber-500" />
        <span className="font-mono text-[11px] text-zinc-300">[{deal.sku}]</span>
        <span className="truncate text-xs text-zinc-400">{deal.recipeName}</span>
        <span className="ms-auto font-mono text-[11px] text-zinc-500">
          {deal.volumeKg.toLocaleString('en')} kg
        </span>
      </div>

      {/* Feasibility + plant */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {deal.feasibility === 'secured' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
            <PackageCheck className="h-3.5 w-3.5" /> {t('supplySecured')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" /> {t('ingredientDeficit')}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
          <Factory className="h-3.5 w-3.5 text-zinc-600" />
          {t('assignTo')}: <span className="text-zinc-300">{deal.recommendedPlant}</span>
          <span className="text-zinc-600">· {t('optimizedLoad')}</span>
        </span>
      </div>

      {/* Simulate Batch → Lab formula */}
      <Link
        href={`/lab/formulas/${deal.formulaId}`}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20"
      >
        <FlaskConical className="h-3.5 w-3.5" />
        {t('simulateBatch')}
      </Link>
    </div>
  );
}

export function CommandCenterView() {
  const t = useTranslations('salesIntel');
  const { data, isPending, isError } = useSalesIntel();

  if (isError) {
    return (
      <section className="rounded-2xl bg-zinc-950 p-6 text-zinc-200">
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4" />
          {t('error')}
        </div>
      </section>
    );
  }

  if (isPending) {
    return (
      <section className="rounded-2xl bg-zinc-950 p-5 text-zinc-200 sm:p-6">
        <div className="mb-6 h-24 animate-pulse rounded-xl bg-zinc-900" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-zinc-900" />
          ))}
        </div>
      </section>
    );
  }

  const deals = [...data!.deals].sort((a, b) => b.weightedRevenue - a.weightedRevenue);

  return (
    <section className="rounded-2xl bg-zinc-950 p-5 text-zinc-200 sm:p-6">
      <header className="mb-5">
        <h1 className="font-serif text-2xl text-zinc-100">{t('title')}</h1>
        <p className="text-sm text-zinc-500">{t('subtitle')}</p>
      </header>

      <KpiBar kpis={data!.kpis} />

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t('pipeline')}
        </h2>
        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
          {t('count', { count: deals.length })}
        </span>
      </div>

      {deals.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {deals.map((d) => (
            <DealCard key={d.id} deal={d} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <TrendingUp className="mb-3 h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">{t('empty')}</p>
        </div>
      )}
    </section>
  );
}
