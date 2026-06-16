'use client';
/**
 * components/modules/finance/finance-tower.tsx
 * -------------------------------------------------------------
 * Executive Control Tower (deep-dark). Corporate health ledger: revenue,
 * cash, working capital (receivables vs payables), EBITDA margin and runway.
 */
import { useTranslations } from 'next-intl';
import {
  Wallet,
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  Percent,
  Timer,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import { useFinancialSnapshot } from '@/features/shared/queries';

const compact = (n: number) => n.toLocaleString('en', { notation: 'compact', maximumFractionDigits: 1 });

function Tile({
  icon: Icon,
  label,
  value,
  accent = 'text-zinc-100',
  unit,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: string;
  unit?: string;
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

export function FinanceTower() {
  const t = useTranslations('finance');
  const { data, isPending, isError } = useFinancialSnapshot();

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
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-900" />
          ))}
        </div>
      </section>
    );
  }

  const workingCapital = data!.receivables - data!.payables;
  const total = data!.receivables + data!.payables || 1;
  const recPct = (data!.receivables / total) * 100;

  return (
    <section className="rounded-2xl bg-zinc-950 p-5 text-zinc-200 sm:p-6">
      <header className="mb-5">
        <h1 className="font-serif text-2xl text-zinc-100">{t('title')}</h1>
        <p className="text-sm text-zinc-500">{t('subtitle')}</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile icon={Wallet} label={t('revenueMTD')} value={`${compact(data!.revenueMTD)}`} unit="AED" accent="text-amber-400" />
        <Tile icon={Banknote} label={t('cash')} value={`${compact(data!.cashInBank)}`} unit="AED" accent="text-emerald-400" />
        <Tile icon={Percent} label={t('ebitda')} value={`${data!.ebitdaMarginPct}`} unit="%" />
        <Tile icon={ArrowDownLeft} label={t('receivables')} value={`${compact(data!.receivables)}`} unit="AED" />
        <Tile icon={ArrowUpRight} label={t('payables')} value={`${compact(data!.payables)}`} unit="AED" accent="text-red-400" />
        <Tile icon={Timer} label={t('runway')} value={`${data!.runwayMonths}`} unit={t('months')} />
      </div>

      {/* Working capital */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{t('workingCapital')}</h2>
          <span className={`font-mono text-lg font-bold ${workingCapital >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {workingCapital >= 0 ? '+' : ''}
            {compact(workingCapital)} AED
          </span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full bg-sky-500/70" style={{ width: `${recPct}%` }} />
          <div className="h-full bg-red-500/70" style={{ width: `${100 - recPct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
          <span>{t('receivables')}: {compact(data!.receivables)}</span>
          <span>{t('payables')}: {compact(data!.payables)}</span>
        </div>
      </div>
    </section>
  );
}
