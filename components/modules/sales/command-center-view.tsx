'use client';
/**
 * components/modules/sales/command-center-view.tsx
 * -------------------------------------------------------------
 * S&OP + Operational Risk Control Center (deep-dark). Replaces the manual
 * offline workflows surfaced in the ops audit (WhatsApp-on-the-wall, paperwork
 * delays) with data-driven widgets:
 *   - Operational Risk Analytics Bar (doc bottlenecks, rush orders, WA backlog),
 *   - S&OP forecast bar,
 *   - audit-driven deal cards (doc tracker, order class, lead-time buffer),
 *   - DMS Intake Queue (WhatsApp → Odoo digital ingestion).
 */
import { useState } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import {
  TrendingUp,
  Factory,
  PackageCheck,
  AlertTriangle,
  FlaskConical,
  Gauge,
  Clock,
  FileText,
  Inbox,
  MessageSquare,
  ChevronDown,
  AlertCircle,
  Loader2,
  Play,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useSalesIntel, useIntakeQueue, useMarkIntakeParsing } from '@/features/sales/queries';
import type { SalesDeal, SalesKpis, IntakeItem, OrderClass, RndStatus } from '@/features/sales/schema';

const compact = (n: number) =>
  n.toLocaleString('en', { notation: 'compact', maximumFractionDigits: 1 });

/* ------------------------------ Risk bar ----------------------------- */

function RiskBar({ kpis }: { kpis: SalesKpis }) {
  const t = useTranslations('salesIntel');
  const tiles = [
    { label: t('docBottlenecks'), value: kpis.docBottlenecks, icon: FileText, danger: kpis.docBottlenecks > 0 },
    { label: t('rushOrders'), value: kpis.activeRushOrders, icon: AlertTriangle, danger: kpis.activeRushOrders > 0 },
    { label: t('intakeBacklog'), value: kpis.whatsappBacklog, icon: MessageSquare, danger: kpis.whatsappBacklog > 0 },
  ];
  return (
    <div className="mb-3 grid grid-cols-3 gap-3">
      {tiles.map((x) => {
        const Icon = x.icon;
        return (
          <div
            key={x.label}
            className={`rounded-xl border p-3 ${
              x.danger ? 'border-amber-500/40 bg-amber-500/[0.06]' : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
              <Icon className={`h-3.5 w-3.5 ${x.danger ? 'text-amber-400' : 'text-zinc-500'}`} /> {x.label}
            </div>
            <div className={`font-mono text-2xl font-bold ${x.danger ? 'text-amber-300' : 'text-zinc-100'}`}>
              {x.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ KPI bar ------------------------------ */

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
          <div className={`h-full rounded-full ${runwayColor(kpis.runwayPct)}`} style={{ width: `${Math.min(100, Math.max(2, kpis.runwayPct))}%` }} />
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Doc tracker ----------------------------- */

function DocChip({ code, ok, sla }: { code: string; ok: boolean; sla?: number }) {
  const showCountdown = code === 'HC' && !ok;
  const label = showCountdown ? (sla && sla > 0 ? `HC ${sla}d` : 'HC !') : code;
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
        ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
      }`}
    >
      {label}
    </span>
  );
}

/* --------------------------- Order class ----------------------------- */

const ORDER_CLASS_STYLE: Record<OrderClass, string> = {
  b2b: 'border-zinc-700 text-zinc-300',
  b2c: 'border-sky-500/40 text-sky-300',
  rush: 'border-amber-500/50 text-amber-300',
};

function OrderClassTag({ cls }: { cls: OrderClass }) {
  const t = useTranslations('salesIntel');
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ORDER_CLASS_STYLE[cls]}`}>
      {cls === 'rush' && <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-400" />}
      {t(`class.${cls}`)}
    </span>
  );
}

/* ----------------------------- Deal card ----------------------------- */

function DealCard({ deal }: { deal: SalesDeal }) {
  const t = useTranslations('salesIntel');
  const p = Math.max(0, Math.min(100, deal.probability));
  const borderColor = `rgba(245,158,11,${(0.15 + (p / 100) * 0.6).toFixed(2)})`;
  const tint = `rgba(245,158,11,${(0.03 + (p / 100) * 0.05).toFixed(3)})`;
  const isRush = deal.orderClass === 'rush';
  const d = deal.documents;

  return (
    <div
      className="relative rounded-xl border bg-zinc-900 p-4 transition hover:bg-zinc-900/70"
      style={{ borderColor, backgroundImage: `linear-gradient(${tint}, ${tint})` }}
    >
      {isRush && (
        <span className="pointer-events-none absolute inset-0 animate-pulse rounded-xl ring-2 ring-amber-500/60" />
      )}

      <div className="mb-1.5 flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-semibold text-zinc-100">{deal.name}</h3>
        <OrderClassTag cls={deal.orderClass} />
      </div>
      <div className="mb-3 truncate text-xs text-zinc-500">{deal.partner ?? '—'}</div>

      {/* Document tracker checklist */}
      <div className="mb-3 flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5 text-zinc-600" />
        <DocChip code="INV" ok={d.inv} />
        <DocChip code="PKL" ok={d.pkl} />
        <DocChip code="HC" ok={d.hc} sla={d.hcSlaDaysLeft} />
        <DocChip code="COO" ok={d.coo} />
      </div>

      {/* Money */}
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
        <span className="ms-auto font-mono text-[11px] text-zinc-500">{deal.volumeKg.toLocaleString('en')} kg</span>
      </div>

      {/* Feasibility + plant + lead buffer */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
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
          {deal.recommendedPlant}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
          <Clock className="h-3.5 w-3.5 text-zinc-600" />
          {t('leadBuffer')}: ~{deal.leadTimeBufferDays}{t('daysShort')}
        </span>
      </div>

      <Link
        href={`/lab/formulas/${deal.formulaId}`}
        className="relative z-10 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20"
      >
        <FlaskConical className="h-3.5 w-3.5" />
        {t('simulateBatch')}
      </Link>
    </div>
  );
}

/* --------------------------- DMS intake ------------------------------ */

const RND_STYLE: Record<RndStatus, string> = {
  unparsed: 'bg-red-500/10 text-red-400',
  parsing: 'bg-sky-500/10 text-sky-300',
  calculated: 'bg-indigo-500/10 text-indigo-300',
  quoted: 'bg-emerald-500/10 text-emerald-400',
};

function DmsPanel() {
  const t = useTranslations('salesIntel');
  const format = useFormatter();
  const { data, isPending } = useIntakeQueue();
  const parse = useMarkIntakeParsing();
  const items = data ?? [];

  return (
    <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="mb-2 flex items-center gap-2 px-1 text-[11px] uppercase tracking-wide text-zinc-500">
        <Inbox className="h-3.5 w-3.5" /> {t('dmsQueue')} · {t('dmsHint')}
      </div>
      {isPending ? (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-900" />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
              <MessageSquare className="h-4 w-4 shrink-0 text-emerald-500/70" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-medium text-zinc-300">{i.sender}</span>
                  <span className="shrink-0 text-[10px] text-zinc-600">
                    {format.dateTime(new Date(i.ts), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="truncate text-[11px] text-zinc-500">{i.snippet}</div>
              </div>
              {i.rndStatus === 'unparsed' && (
                <button
                  onClick={() => parse.mutate(i)}
                  disabled={parse.isPending}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {parse.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  {t('parse')}
                </button>
              )}
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${RND_STYLE[i.rndStatus]}`}>
                {t(`rnd.${i.rndStatus}`)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- View -------------------------------- */

export function CommandCenterView() {
  const t = useTranslations('salesIntel');
  const { data, isPending, isError } = useSalesIntel();
  const [dmsOpen, setDmsOpen] = useState(false);

  if (isError) {
    return (
      <section className="rounded-2xl bg-zinc-950 p-6 text-zinc-200">
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4" /> {t('error')}
        </div>
      </section>
    );
  }

  if (isPending) {
    return (
      <section className="rounded-2xl bg-zinc-950 p-5 text-zinc-200 sm:p-6">
        <div className="mb-3 grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-900" />
          ))}
        </div>
        <div className="mb-6 h-24 animate-pulse rounded-xl bg-zinc-900" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-zinc-900" />
          ))}
        </div>
      </section>
    );
  }

  const deals = [...data!.deals].sort((a, b) => b.weightedRevenue - a.weightedRevenue);

  return (
    <section className="rounded-2xl bg-zinc-950 p-5 text-zinc-200 sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-zinc-100">{t('title')}</h1>
          <p className="text-sm text-zinc-500">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setDmsOpen((s) => !s)}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800"
        >
          <Inbox className="h-4 w-4 text-amber-500" />
          {t('dmsQueue')}
          <span className="rounded-full bg-amber-500/20 px-1.5 text-[11px] text-amber-300">
            {data!.kpis.whatsappBacklog}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 transition ${dmsOpen ? 'rotate-180' : ''}`} />
        </button>
      </header>

      <RiskBar kpis={data!.kpis} />
      <KpiBar kpis={data!.kpis} />

      {dmsOpen && <DmsPanel />}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{t('pipeline')}</h2>
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
