'use client';
/**
 * components/modules/hr/hr-view.tsx
 * -------------------------------------------------------------
 * HR performance & factory-floor allocation (deep-dark). Headcount KPIs,
 * per-department utilization, and operator coverage per plant.
 */
import { useTranslations } from 'next-intl';
import { Users, Gauge, UserPlus, Factory, AlertCircle } from 'lucide-react';
import { useHrMetrics } from '@/features/shared/queries';

function util(pct: number): string {
  if (pct >= 85) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export function HrView() {
  const t = useTranslations('hr');
  const { data, isPending, isError } = useHrMetrics();

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
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-900" />
          ))}
        </div>
        <div className="mt-4 h-64 animate-pulse rounded-xl bg-zinc-900" />
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-zinc-950 p-5 text-zinc-200 sm:p-6">
      <header className="mb-5">
        <h1 className="font-serif text-2xl text-zinc-100">{t('title')}</h1>
        <p className="text-sm text-zinc-500">{t('subtitle')}</p>
      </header>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
            <Users className="h-3.5 w-3.5 text-amber-500" /> {t('headcount')}
          </div>
          <div className="font-mono text-2xl font-bold text-zinc-100">{data!.totalHeadcount}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
            <Gauge className="h-3.5 w-3.5 text-amber-500" /> {t('utilization')}
          </div>
          <div className="font-mono text-2xl font-bold text-zinc-100">{data!.avgUtilizationPct}%</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
            <UserPlus className="h-3.5 w-3.5 text-amber-500" /> {t('openRoles')}
          </div>
          <div className="font-mono text-2xl font-bold text-amber-400">{data!.openRoles}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Departments */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">{t('departments')}</h2>
          <div className="space-y-3">
            {data!.units.map((u) => (
              <div key={u.dept}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-zinc-300">{u.dept}</span>
                  <span className="text-zinc-500">
                    {u.headcount} · {u.utilizationPct}%{u.openRoles ? ` · +${u.openRoles}` : ''}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div className={`h-full rounded-full ${util(u.utilizationPct)}`} style={{ width: `${u.utilizationPct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Factory floor */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            <Factory className="h-4 w-4" /> {t('floor')}
          </h2>
          <div className="space-y-3">
            {data!.floor.map((f) => (
              <div key={f.factoryId} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-200">{f.factoryName}</span>
                  <span className="text-[11px] text-zinc-500">
                    {f.operators} {t('operators')} · {f.shifts} {t('shifts')}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <div className={`h-full rounded-full ${util(f.coveragePct)}`} style={{ width: `${f.coveragePct}%` }} />
                  </div>
                  <span className="w-10 text-right font-mono text-[11px] text-zinc-400">{f.coveragePct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
