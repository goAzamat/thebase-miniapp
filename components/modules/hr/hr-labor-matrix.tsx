'use client';
/**
 * components/modules/hr/hr-labor-matrix.tsx
 * -------------------------------------------------------------
 * Labor Operations & Quality Compliance monitor (deep-dark, Bloomberg-dense):
 *   A. Factory-Floor Operator OEE matrix (underperforming → soft amber pulse).
 *   B. HACCP Sanitary Clearance gate (expired / <7d → crimson SUSPENDED + lock).
 *   C. R&D Laboratory dispatch — formulation velocity.
 */
import { Fragment } from 'react';
import { useTranslations } from 'next-intl';
import {
  Users,
  HeartPulse,
  Activity,
  Timer,
  FlaskConical,
  ShieldAlert,
  AlertCircle,
  Star,
  Factory,
} from 'lucide-react';
import { useHrLabor } from '@/features/hr/queries';
import {
  isHealthCritical,
  oeeBand,
  type AssignedStage,
  type SanitaryStatus,
} from '@/features/hr/schema';

const OEE_COLOR: Record<'high' | 'mid' | 'low', string> = {
  high: 'text-emerald-400',
  mid: 'text-amber-300',
  low: 'text-red-400',
};
const SANITARY_STYLE: Record<SanitaryStatus, string> = {
  valid: 'bg-emerald-500/10 text-emerald-400',
  expiring: 'bg-amber-500/10 text-amber-300',
  expired: 'bg-red-500/10 text-red-400',
};

function stageLabel(t: ReturnType<typeof useTranslations>, s: AssignedStage): string {
  return s === 'mixing' ? t('stageMixing') : t('stageBottling');
}

export function HrLaborMatrix() {
  const t = useTranslations('hr');
  const { data, isPending, isError } = useHrLabor();

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
        <div className="h-64 animate-pulse rounded-xl bg-zinc-900" />
        <div className="mt-4 h-48 animate-pulse rounded-xl bg-zinc-900" />
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-zinc-950 p-5 text-zinc-200 sm:p-6">
      <header className="mb-5 flex items-center gap-2">
        <Users className="h-5 w-5 text-amber-500" />
        <div>
          <h1 className="font-serif text-2xl text-zinc-100">{t('title')}</h1>
          <p className="text-sm text-zinc-500">{t('subtitle')}</p>
        </div>
      </header>

      {/* ---------- Task A: OEE matrix ---------- */}
      <section className="mb-7">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          <Activity className="h-4 w-4 text-amber-500" /> {t('floorTitle')}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-900/60 text-left text-[10px] uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-2.5 font-semibold">{t('worker')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('facilityCol')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('stage')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('batch')}</th>
                <th className="px-3 py-2.5 text-right font-semibold">{t('oee')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('shiftCol')}</th>
              </tr>
            </thead>
            <tbody>
              {data!.operators.map((o) => {
                const under = o.shiftStatus === 'underperforming';
                return (
                  <tr key={o.workerId} className={`border-t border-zinc-800 text-sm ${under ? 'animate-pulse bg-amber-500/[0.06]' : 'hover:bg-zinc-900/40'}`}>
                    <td className="px-3 py-2.5">
                      <div className="text-zinc-200">{o.name}</div>
                      <div className="font-mono text-[10px] text-zinc-600">{o.workerId}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-zinc-400">{t(`facilityName.${o.facilityId}`)}</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-400">{stageLabel(t, o.assignedStage)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">{o.activeBatchId}</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-bold ${OEE_COLOR[oeeBand(o.oeePercentage)]}`}>{o.oeePercentage}%</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${under ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {under ? t('underperforming') : t('optimal')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Task B: HACCP sanitary gate ---------- */}
      <section className="mb-7">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          <HeartPulse className="h-4 w-4 text-red-400" /> {t('healthTitle')}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-900/60 text-left text-[10px] uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-2.5 font-semibold">{t('employee')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('role')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('sanitaryCard')}</th>
                <th className="px-3 py-2.5 text-right font-semibold">{t('renewal')}</th>
              </tr>
            </thead>
            <tbody>
              {data!.health.map((h) => {
                const critical = isHealthCritical(h);
                return (
                  <Fragment key={h.employeeName}>
                    <tr className={`border-t border-zinc-800 text-sm ${critical ? 'bg-red-500/[0.07]' : 'hover:bg-zinc-900/40'}`}>
                      <td className={`px-3 py-2.5 ${critical ? 'text-red-200' : 'text-zinc-200'}`}>{h.employeeName}</td>
                      <td className="px-3 py-2.5 text-xs text-zinc-400">{h.role}</td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${critical ? 'bg-red-500/10 text-red-400' : SANITARY_STYLE[h.sanitaryCardStatus]}`}>
                          {critical ? t('suspended') : t(h.sanitaryCardStatus)}
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 text-right font-mono ${critical ? 'text-red-300' : 'text-zinc-400'}`}>
                        {h.daysToRenewal < 0 ? `${h.daysToRenewal}` : `${h.daysToRenewal}${t('daysShort')}`}
                      </td>
                    </tr>
                    {critical && (
                      <tr className="bg-red-500/[0.05]">
                        <td colSpan={4} className="px-3 pb-2.5 text-[11px] text-red-300/90">
                          <span className="inline-flex items-center gap-1.5">
                            <ShieldAlert className="h-3.5 w-3.5" /> {t('complianceLock')}
                          </span>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Task C: R&D velocity ---------- */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          <FlaskConical className="h-4 w-4 text-amber-500" /> {t('rndTitle')}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data!.rnd.map((c) => (
            <div key={c.chemistName} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-zinc-100">{c.chemistName}</span>
                <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                  <Star className="h-3.5 w-3.5 fill-current" /> {c.executionRating.toFixed(1)}
                </span>
              </div>
              <div className="flex items-end justify-between border-t border-zinc-800 pt-3">
                <div>
                  <div className="font-mono text-xl font-bold text-zinc-100">{c.activeBriefsCount}</div>
                  <div className="text-[10px] uppercase tracking-wide text-zinc-600">{t('activeBriefs')}</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 font-mono text-lg font-bold text-zinc-200">
                    <Timer className="h-4 w-4 text-zinc-500" /> {c.avgFormulationTimeDays}{t('daysShort')}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-zinc-600">{t('avgTime')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
