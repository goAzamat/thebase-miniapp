'use client';
/**
 * components/modules/production/production-board.tsx
 * -------------------------------------------------------------
 * Production control board (deep-dark). Predictive demand-vs-capacity header
 * (Sales→Production link) + live batch cards with a mixing→bottling→qc→ready
 * stepper and Yield Variance (Production→Lab link) badges.
 */
import { useTranslations } from 'next-intl';
import {
  Factory,
  FlaskConical,
  Droplet,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import { useProductionBatches, usePipelineMetrics } from '@/features/shared/queries';
import type { BatchStatus, FactoryId, ProductionBatch } from '@/types/erp';

const STATUS_ORDER: BatchStatus[] = ['mixing', 'bottling', 'qc', 'ready'];
const STATUS_META: Record<BatchStatus, { icon: LucideIcon; key: string }> = {
  mixing: { icon: FlaskConical, key: 'mixing' },
  bottling: { icon: Droplet, key: 'bottling' },
  qc: { icon: ShieldCheck, key: 'qc' },
  ready: { icon: CheckCircle2, key: 'ready' },
};
const FACTORY_LABEL: Record<FactoryId, string> = {
  dubai: 'Dubai · Al Quoz',
  ajman: 'Ajman Plant',
  malaysia: 'Malaysia',
};

function varianceColor(v: number): string {
  const a = Math.abs(v);
  if (a <= 1) return 'text-emerald-400';
  if (a <= 3) return 'text-amber-400';
  return 'text-red-400';
}

function Stepper({ status }: { status: BatchStatus }) {
  const t = useTranslations('production');
  const current = STATUS_ORDER.indexOf(status);
  return (
    <div className="flex items-center">
      {STATUS_ORDER.map((s, i) => {
        const Icon = STATUS_META[s].icon;
        const done = i <= current;
        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                  done ? 'border-amber-500/50 bg-amber-500/15 text-amber-300' : 'border-zinc-800 bg-zinc-900 text-zinc-600'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className={`text-[9px] ${done ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {t(STATUS_META[s].key)}
              </span>
            </div>
            {i < STATUS_ORDER.length - 1 && (
              <span className={`mx-1 mb-3.5 h-0.5 w-5 ${i < current ? 'bg-amber-500/50' : 'bg-zinc-800'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BatchCard({ b }: { b: ProductionBatch }) {
  const t = useTranslations('production');
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-sm font-semibold text-zinc-100">{b.id}</span>
          <div className="mt-0.5 text-xs text-zinc-500">
            {b.orderId} · {FACTORY_LABEL[b.factoryId]}
          </div>
        </div>
        <span className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
          {b.formulaSKU}
        </span>
      </div>

      <Stepper status={b.batchStatus} />

      <div className="mt-3 flex items-end justify-between border-t border-zinc-800 pt-3">
        <div className="text-xs text-zinc-500">
          <span className="text-zinc-300">{b.actualKg.toLocaleString('en')}</span> /{' '}
          {b.plannedKg.toLocaleString('en')} kg
        </div>
        <div className="text-right">
          <div className={`font-mono text-base font-bold ${varianceColor(b.yieldVariance)}`}>
            {b.yieldVariance > 0 ? '+' : ''}
            {b.yieldVariance}%
          </div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-600">{t('yieldVariance')}</div>
        </div>
      </div>
    </div>
  );
}

export function ProductionBoard() {
  const t = useTranslations('production');
  const batches = useProductionBatches();
  const pipeline = usePipelineMetrics();

  return (
    <section className="rounded-2xl bg-zinc-950 p-5 text-zinc-200 sm:p-6">
      <header className="mb-5">
        <h1 className="font-serif text-2xl text-zinc-100">{t('title')}</h1>
        <p className="text-sm text-zinc-500">{t('subtitle')}</p>
      </header>

      {/* Demand vs capacity (Sales → Production) */}
      {pipeline.data && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">{t('projected')}</div>
            <div className="font-mono text-xl font-bold text-zinc-100">{pipeline.data.projectedVolumeTons} t</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">{t('committed')}</div>
            <div className="font-mono text-xl font-bold text-amber-400">{pipeline.data.committedVolumeTons} t</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">{t('free')}</div>
            <div className="font-mono text-xl font-bold text-emerald-400">{pipeline.data.freeCapacityTons} t</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">{t('runway')}</div>
            <div className="font-mono text-xl font-bold text-zinc-100">{pipeline.data.runwayPct}%</div>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <Factory className="h-4 w-4 text-zinc-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{t('liveBatches')}</h2>
      </div>

      {batches.isError ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4" /> {t('error')}
        </div>
      ) : batches.isPending ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-zinc-900" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {batches.data!.map((b) => (
            <BatchCard key={b.id} b={b} />
          ))}
        </div>
      )}
    </section>
  );
}
