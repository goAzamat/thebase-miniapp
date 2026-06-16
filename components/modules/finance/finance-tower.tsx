'use client';
/**
 * components/modules/finance/finance-tower.tsx
 * -------------------------------------------------------------
 * Finance Control Tower & Cost Leakage Auditor (deep-dark):
 *   A. Cost of Losses & Poor Quality (COPQ) audit + % of revenue gauge.
 *   B. AR Aging matrix with the 100+ day [SYSTEM LOCK] credit restriction.
 *   C. CEO Project Governance board + named-owner/milestone KPI.
 */
import { useTranslations, useFormatter } from 'next-intl';
import {
  TrendingDown,
  ShieldAlert,
  FolderGit2,
  Activity,
  Wallet,
  Banknote,
  Percent,
  Timer,
  Lock,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import { useFinanceControl } from '@/features/finance/queries';
import {
  totalCopqAed,
  type AgingBucketKey,
  type ProjectStatus,
} from '@/features/finance/schema';

const compact = (n: number) => n.toLocaleString('en', { notation: 'compact', maximumFractionDigits: 1 });
const aed = (n: number) => n.toLocaleString('en', { maximumFractionDigits: 0 });

const PROJ_STYLE: Record<ProjectStatus, string> = {
  on_track: 'bg-emerald-500/10 text-emerald-400',
  at_risk: 'bg-amber-500/10 text-amber-300',
  blocked: 'bg-red-500/10 text-red-400',
};
const BUCKET_ORDER: AgingBucketKey[] = ['current', 'd31_60', 'd61_90', 'd100plus'];

function Tile({ icon: Icon, label, value, unit, accent = 'text-zinc-100' }: {
  icon: LucideIcon; label: string; value: string; unit?: string; accent?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
        <Icon className="h-3.5 w-3.5 text-amber-500" /> {label}
      </div>
      <div className={`font-mono text-2xl font-bold ${accent}`}>
        {value}
        {unit ? <span className="ms-1 text-sm text-zinc-500">{unit}</span> : null}
      </div>
    </div>
  );
}

function CopqRing({ pct, danger }: { pct: number; danger: boolean }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, pct / 15)); // 0–15% visual scale
  const dash = c * frac;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#27272a" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={danger ? '#ef4444' : '#f59e0b'} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`} transform="rotate(-90 50 50)"
      />
      <text x="50" y="49" textAnchor="middle" fontSize="18" className="fill-zinc-100 font-bold">{pct}%</text>
      <text x="50" y="63" textAnchor="middle" fontSize="7" className="fill-zinc-500">COPQ / REV</text>
    </svg>
  );
}

export function FinanceTower() {
  const t = useTranslations('finance');
  const format = useFormatter();
  const { data, isPending, isError } = useFinanceControl();

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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-900" />)}
        </div>
        <div className="mt-4 h-56 animate-pulse rounded-xl bg-zinc-900" />
      </section>
    );
  }

  const s = data!.snapshot;
  const l = data!.losses;
  const copqTotal = totalCopqAed(l);
  const copqDanger = l.copqPercentageOfRevenue > 3;

  return (
    <section className="rounded-2xl bg-zinc-950 p-5 text-zinc-200 sm:p-6">
      <header className="mb-5 flex items-center gap-2">
        <Activity className="h-5 w-5 text-amber-500" />
        <div>
          <h1 className="font-serif text-2xl text-zinc-100">{t('title')}</h1>
          <p className="text-sm text-zinc-500">{t('subtitle')}</p>
        </div>
      </header>

      {/* Snapshot KPIs */}
      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile icon={Wallet} label={t('revenueMTD')} value={compact(s.revenueMTD)} unit="AED" accent="text-amber-400" />
        <Tile icon={Banknote} label={t('cash')} value={compact(s.cashInBank)} unit="AED" accent="text-emerald-400" />
        <Tile icon={Percent} label={t('ebitda')} value={`${s.ebitdaMarginPct}`} unit="%" />
        <Tile icon={Activity} label={t('receivables')} value={compact(s.receivables)} unit="AED" />
        <Tile icon={TrendingDown} label={t('payables')} value={compact(s.payables)} unit="AED" accent="text-red-400" />
        <Tile icon={Timer} label={t('runway')} value={`${s.runwayMonths}`} unit={t('months')} />
      </div>

      {/* ---------- Task A: COPQ ---------- */}
      <section className="mb-7">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          <TrendingDown className="h-4 w-4 text-red-400" /> {t('copqTitle')}
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-2">
            <LeakTile t={t} label={t('sunkCapital')} value={l.cancelledOrdersCostAed} hint={t('sunkHint')} />
            <LeakTile t={t} label={t('holdingCost')} value={l.deadStockHoldingCostAed} />
            <LeakTile t={t} label={t('panicPremium')} value={l.rushPurchasePremiumAed} />
            <LeakTile t={t} label={t('copqScrap')} value={l.copqScrapAed} />
            <div className="rounded-xl border border-red-500/40 bg-red-500/[0.07] p-4 sm:col-span-2">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-red-300/80">
                <ShieldAlert className="h-3.5 w-3.5" /> {t('sugarIncident')}
              </div>
              <div className="font-mono text-xl font-bold text-red-300">−{aed(l.sugarContaminationLossAed)} <span className="text-sm text-red-400/70">AED</span></div>
            </div>
          </div>
          {/* COPQ % of revenue gauge */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <CopqRing pct={l.copqPercentageOfRevenue} danger={copqDanger} />
            <div className="mt-2 text-center">
              <div className="text-[11px] text-zinc-500">{t('copqOfRevenue')}</div>
              <div className={`text-xs font-semibold ${copqDanger ? 'text-red-400' : 'text-emerald-400'}`}>
                {t('target')}: ≤ 3% · {t('totalLeak')} {compact(copqTotal)} AED
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Task B: AR Aging + System Lock ---------- */}
      <section className="mb-7">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          <ShieldAlert className="h-4 w-4 text-amber-400" /> {t('arTitle')}
        </h2>

        {data!.systemLock && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="font-mono font-bold text-red-200">[SYSTEM LOCK]</span> {t('systemLockMsg')}{' '}
              <span className="font-semibold">{data!.lockedClients.join(', ')}</span>
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BUCKET_ORDER.map((key) => {
            const b = data!.aging.find((x) => x.key === key);
            const amt = b?.amountAed ?? 0;
            const locked = b?.locked ?? false;
            return (
              <div key={key} className={`rounded-xl border p-3 ${locked ? 'border-red-500/40 bg-red-500/[0.07]' : 'border-zinc-800 bg-zinc-900/60'}`}>
                <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-zinc-500">
                  <span>{t(`bucket.${key}`)}</span>
                  {locked && <Lock className="h-3 w-3 text-red-400" />}
                </div>
                <div className={`font-mono text-lg font-bold ${locked ? 'text-red-300' : 'text-zinc-100'}`}>{compact(amt)}</div>
                <div className="mt-1 truncate text-[10px] text-zinc-600">{b?.clients.join(', ')}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- Task C: Project Governance ---------- */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            <FolderGit2 className="h-4 w-4" /> {t('projectsTitle')}
          </h2>
          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
            {t('governanceKpi')}: <span className="font-mono font-bold text-amber-300">{data!.governanceKpiPct}%</span>
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-900/60 text-left text-[10px] uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-2.5 font-semibold">{t('project')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('owner')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('milestone')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('status')}</th>
                <th className="px-3 py-2.5 text-right font-semibold">{t('budget')}</th>
              </tr>
            </thead>
            <tbody>
              {data!.projects.map((p) => (
                <tr key={p.id} className="border-t border-zinc-800 text-sm hover:bg-zinc-900/40">
                  <td className="px-3 py-2.5">
                    <div className="text-zinc-200">{p.name}</div>
                    <div className="text-[11px] text-zinc-600">{p.successKpi}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-zinc-400">{p.owner}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">
                    {format.dateTime(new Date(p.milestoneDate), { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PROJ_STYLE[p.status]}`}>
                      {t(`projStatus.${p.status}`)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-zinc-300">{aed(p.budgetAed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function LeakTile({ t, label, value, hint }: { t: ReturnType<typeof useTranslations>; label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-1 text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="font-mono text-xl font-bold text-zinc-100">−{aed(value)} <span className="text-sm text-zinc-500">AED</span></div>
      {hint && <div className="mt-0.5 text-[10px] text-zinc-600">{hint}</div>}
    </div>
  );
}
