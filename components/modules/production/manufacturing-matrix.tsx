'use client';
/**
 * components/modules/production/manufacturing-matrix.tsx
 * -------------------------------------------------------------
 * Manufacturing Operations & QA control matrix (deep-dark):
 *   A. Factory-floor monitor split by facility, with a multi-stage timeline.
 *   B. Expandable Yield Variance audit matrix (critical alert > +3% loss).
 *   C. QA Release gate (QA Hold → Released to Logistics).
 */
import { Fragment, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Gauge,
  FlaskConical,
  Boxes,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  AlertCircle,
  Factory,
  Play,
  Loader2,
} from 'lucide-react';
import { useProductionData, useStartBatch } from '@/features/production/queries';
import { Toast } from '@/components/core/feedback/toast';
import {
  PRODUCTION_STAGES,
  VARIANCE_LOSS_THRESHOLD,
  batchLossAed,
  type ProductionBatch,
} from '@/features/production/schema';

const FACILITIES = ['dubai', 'ajman'] as const;
const aed = (n: number) => n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (n: number) => n.toLocaleString('en', { maximumFractionDigits: 0 });

/* ----------------------------- Timeline ------------------------------ */

function Timeline({ status }: { status: ProductionBatch['status'] }) {
  const t = useTranslations('production');
  const cur = PRODUCTION_STAGES.indexOf(status);
  return (
    <div className="flex items-center">
      {PRODUCTION_STAGES.map((s, i) => {
        const done = i < cur;
        const active = i === cur;
        return (
          <Fragment key={s}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={`h-2.5 w-2.5 rounded-full transition ${
                  done
                    ? 'bg-amber-500'
                    : active
                      ? 'bg-amber-400 ring-4 ring-amber-500/20 animate-pulse'
                      : 'bg-zinc-700'
                }`}
              />
              <span className={`whitespace-nowrap text-[9px] ${i <= cur ? 'text-zinc-300' : 'text-zinc-600'}`}>
                {t(`stage.${s}`)}
              </span>
            </div>
            {i < PRODUCTION_STAGES.length - 1 && (
              <span className={`mx-1 mb-3.5 h-0.5 flex-1 ${i < cur ? 'bg-amber-500/50' : 'bg-zinc-800'}`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/* ------------------------------ QA badge ----------------------------- */

function QaBadge({ batch }: { batch: ProductionBatch }) {
  const t = useTranslations('production');
  if (batch.status === 'ready' && batch.qaCleared) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
        <ShieldCheck className="h-3.5 w-3.5" /> {t('qa.released')}
      </span>
    );
  }
  if (batch.status === 'ready' && !batch.qaCleared) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
        <ShieldAlert className="h-3.5 w-3.5" /> {t('qa.hold')}
      </span>
    );
  }
  return (
    <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase text-zinc-300">
      {t(`stage.${batch.status}`)}
    </span>
  );
}

/* ---------------------------- Variance matrix ------------------------ */

function VarianceMatrix({ batch }: { batch: ProductionBatch }) {
  const t = useTranslations('production');
  if (batch.variance.length === 0) {
    return <div className="px-3 py-3 text-[11px] text-zinc-600">{t('noVariance')}</div>;
  }
  const loss = batchLossAed(batch);
  return (
    <div className="overflow-x-auto border-t border-zinc-800">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-zinc-950/60 text-left text-[10px] uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-2 font-semibold">{t('matrix.ingredient')}</th>
            <th className="px-3 py-2 text-right font-semibold">{t('matrix.theoretical')}</th>
            <th className="px-3 py-2 text-right font-semibold">{t('matrix.actual')}</th>
            <th className="px-3 py-2 text-right font-semibold">{t('matrix.variance')}</th>
            <th className="px-3 py-2 text-right font-semibold">{t('matrix.costImpact')}</th>
          </tr>
        </thead>
        <tbody>
          {batch.variance.map((v) => {
            const critical = v.variancePercentage > VARIANCE_LOSS_THRESHOLD;
            return (
              <tr
                key={v.ingredientName}
                className={`border-t border-zinc-800/60 text-xs ${critical ? 'bg-red-500/10' : ''}`}
              >
                <td className={`px-3 py-2 ${critical ? 'text-red-300' : 'text-zinc-300'}`}>{v.ingredientName}</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-400">{num(v.theoreticalQtyKg)}</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">{num(v.actualQtyKg)}</td>
                <td className={`px-3 py-2 text-right font-mono font-semibold ${critical ? 'text-red-300' : v.variancePercentage > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                  {v.variancePercentage > 0 ? '+' : ''}{v.variancePercentage}%
                </td>
                <td className={`px-3 py-2 text-right font-mono ${v.costImpactAed > 0 ? 'text-red-300' : 'text-emerald-400'}`}>
                  {v.costImpactAed > 0 ? '+' : ''}{aed(v.costImpactAed)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-800 text-xs">
            <td colSpan={4} className="px-3 py-2 text-right text-[11px] uppercase tracking-wide text-zinc-500">
              {t('loss')}
            </td>
            <td className={`px-3 py-2 text-right font-mono font-bold ${loss > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {aed(loss)} AED
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ------------------------------ Batch card --------------------------- */

type GateInfo = { kind: 'credit' | 'haccp'; subject: string };

function BatchCard({ batch, onGate }: { batch: ProductionBatch; onGate: (g: GateInfo) => void }) {
  const t = useTranslations('production');
  const start = useStartBatch();
  const [open, setOpen] = useState(false);
  const yieldPct = batch.targetYieldUnits > 0 ? Math.round((batch.actualYieldUnits / batch.targetYieldUnits) * 100) : 0;
  const loss = batchLossAed(batch);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-zinc-100">
              {batch.live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Live Odoo" />}
              {batch.id}
            </div>
            <div className="mt-0.5 truncate text-xs text-zinc-500">
              {batch.salesOrderId} · <span className="font-mono">[{batch.formulaSku}]</span> {batch.formulaName}
            </div>
          </div>
          <QaBadge batch={batch} />
        </div>

        <Timeline status={batch.status} />

        <div className="mt-4 flex items-end justify-between border-t border-zinc-800 pt-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Gauge className="h-4 w-4 text-amber-500" />
            <span className="font-mono text-zinc-300">{num(batch.actualYieldUnits)}</span>
            <span>/ {num(batch.targetYieldUnits)} {t('units')}</span>
            <span className={`font-semibold ${yieldPct >= 98 ? 'text-emerald-400' : yieldPct > 0 ? 'text-amber-300' : 'text-zinc-600'}`}>
              {yieldPct}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            {loss > 0 && (
              <span className="font-mono text-xs font-semibold text-red-400">−{aed(loss)} AED</span>
            )}
            {batch.status === 'queued' && (
              <button
                onClick={() =>
                  start.mutate(
                    { id: batch.id },
                    {
                      onError: (e: unknown) => {
                        const err = e as { code?: string; client?: string; operatorName?: string };
                        if (err.code === 'HACCP_COMPLIANCE_VIOLATION') {
                          onGate({ kind: 'haccp', subject: err.operatorName ?? '' });
                        } else {
                          onGate({ kind: 'credit', subject: err.client ?? batch.clientName });
                        }
                      },
                    },
                  )
                }
                disabled={start.isPending}
                className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
              >
                {start.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                {t('start')}
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-center gap-1.5 border-t border-zinc-800 py-2 text-[11px] font-semibold text-zinc-400 transition hover:bg-zinc-800/40"
      >
        <Boxes className="h-3.5 w-3.5" />
        {open ? t('collapse') : t('expand')}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && <VarianceMatrix batch={batch} />}
    </div>
  );
}

/* ------------------------------- View -------------------------------- */

export function ManufacturingMatrix() {
  const t = useTranslations('production');
  const tc = useTranslations('common');
  const { data, isPending, isError } = useProductionData();
  const [gate, setGate] = useState<GateInfo | null>(null);

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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl bg-zinc-900" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-zinc-950 p-5 text-zinc-200 sm:p-6">
      <header className="mb-5 flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-amber-500" />
        <div>
          <h1 className="font-serif text-2xl text-zinc-100">{t('floorTitle')}</h1>
          <p className="text-sm text-zinc-500">{t('subtitle')}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {FACILITIES.map((f) => {
          const batches = data!.batches.filter((b) => b.facilityId === f);
          return (
            <div key={f}>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                <Factory className="h-4 w-4 text-zinc-500" /> {t(`facility.${f}`)}
                <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-500">{batches.length}</span>
              </div>
              <div className="space-y-3">
                {batches.map((b) => (
                  <BatchCard key={b.id} batch={b} onGate={setGate} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {gate && (
        <Toast
          title={gate.kind === 'haccp' ? tc('haccpLockTitle') : tc('creditLockTitle')}
          message={
            gate.kind === 'haccp'
              ? tc('haccpLockMsg', { name: gate.subject })
              : tc('creditLockMsg', { client: gate.subject })
          }
          onClose={() => setGate(null)}
        />
      )}
    </section>
  );
}
