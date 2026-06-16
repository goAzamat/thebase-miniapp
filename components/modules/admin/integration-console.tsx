'use client';
/**
 * components/modules/admin/integration-console.tsx
 * -------------------------------------------------------------
 * Module 7 — Integration Console & Governance Admin.
 *
 *   Task A  Core API Health Monitor ......... the Ping Board + Run Diagnostic
 *   Task B  Idempotency Ledger & Webhook Auditor ......... live queue logs
 *   Task C  Strategic Feature Flags ......... master override switches
 *
 * Premium high-density Bloomberg-terminal canvas (zinc-900/950, amber/emerald).
 */
import { useTranslations, useFormatter } from 'next-intl';
import {
  Activity,
  Radio,
  Terminal,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  ShieldOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAdminConsole, useRunDiagnostic, useToggleGate } from '@/features/admin/queries';
import type { ApiHealth, ApiStatus, GateConfig, LedgerRow, LedgerRowStatus } from '@/features/admin/schema';

/* ---- visual maps ------------------------------------------------- */

const HEALTH_META: Record<ApiHealth, { dot: string; text: string; ring: string }> = {
  online: { dot: 'bg-emerald-400', text: 'text-emerald-400', ring: 'border-emerald-500/30 bg-emerald-500/[0.04]' },
  degraded: { dot: 'bg-amber-400', text: 'text-amber-400', ring: 'border-amber-500/30 bg-amber-500/[0.04]' },
  offline: { dot: 'bg-red-400', text: 'text-red-400', ring: 'border-red-500/30 bg-red-500/[0.04]' },
};

const LEDGER_META: Record<LedgerRowStatus, string> = {
  pending: 'text-amber-300 bg-amber-500/10 ring-amber-500/20',
  processed: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/20',
  failed: 'text-red-300 bg-red-500/10 ring-red-500/20',
};

/* ---- root -------------------------------------------------------- */

export function IntegrationConsole() {
  const t = useTranslations('admin');
  const { data, isPending, isError } = useAdminConsole();

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
        <div className="h-72 animate-pulse rounded-xl bg-zinc-900" />
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-2xl bg-zinc-950 p-5 text-zinc-200 sm:p-6">
      <header>
        <h1 className="font-serif text-2xl text-zinc-100">{t('title')}</h1>
        <p className="text-sm text-zinc-500">{t('subtitle')}</p>
      </header>

      <PingBoard apis={data.apis} />
      <LedgerAuditor ledger={data.ledger} stats={data.ledgerStats} />
      <FeatureFlags gates={data.gates} />
    </section>
  );
}

/* ---- Task A — Ping Board ----------------------------------------- */

function PingBoard({ apis }: { apis: ApiStatus[] }) {
  const t = useTranslations('admin');
  const format = useFormatter();
  const diag = useRunDiagnostic();

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{t('pingTitle')}</h2>
        </div>
        <button
          onClick={() => diag.mutate()}
          disabled={diag.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
        >
          {diag.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
          {diag.isPending ? t('diagnosticRunning') : t('runDiagnostic')}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {apis.map((a) => {
          const meta = HEALTH_META[a.status];
          return (
            <div key={a.service} className={`rounded-xl border p-4 ${meta.ring}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-100">{t(`serviceLabel.${a.service}`)}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-zinc-500">{t(`serviceDesc.${a.service}`)}</div>
                </div>
                <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0">
                  {a.status === 'online' && (
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${meta.dot} opacity-60`} />
                  )}
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <span className={`text-xs font-semibold uppercase tracking-wide ${meta.text}`}>
                  {t(`healthValue.${a.status}`)}
                </span>
                <span className="font-mono text-lg tabular-nums text-zinc-200">
                  {a.latencyMs}
                  <span className="ml-0.5 text-xs text-zinc-500">ms</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {diag.data && (
        <p className="mt-3 text-[11px] text-zinc-600">
          {t('lastChecked')} {format.dateTime(new Date(), { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      )}
    </div>
  );
}

/* ---- Task B — Idempotency Ledger / Webhook Auditor --------------- */

function LedgerAuditor({ ledger, stats }: { ledger: LedgerRow[]; stats: Record<LedgerRowStatus, number> }) {
  const t = useTranslations('admin');
  const format = useFormatter();

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-zinc-500" />
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{t('ledgerTitle')}</h2>
            <p className="text-[11px] text-zinc-600">{t('ledgerSubtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-300">{t('ledgerStatus.pending')} {stats.pending}</span>
          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-300">{t('ledgerStatus.processed')} {stats.processed}</span>
          <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-red-300">{t('ledgerStatus.failed')} {stats.failed}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <div className="hidden grid-cols-[2.4fr_1fr_1.2fr_2.6fr] gap-3 bg-zinc-900/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 md:grid">
          <div>{t('col.messageId')}</div>
          <div>{t('col.status')}</div>
          <div>{t('col.receivedAt')}</div>
          <div>{t('col.error')}</div>
        </div>
        {ledger.map((row) => (
          <div
            key={row.messageId}
            className="grid grid-cols-1 gap-2 border-t border-zinc-800/70 px-3 py-2.5 text-xs md:grid-cols-[2.4fr_1fr_1.2fr_2.6fr] md:items-center"
          >
            <span className="truncate font-mono text-zinc-300" title={row.messageId}>{row.messageId}</span>
            <span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${LEDGER_META[row.status]}`}>
                {t(`ledgerStatus.${row.status}`)}
              </span>
            </span>
            <span className="font-mono text-zinc-500">
              {format.dateTime(new Date(row.receivedAt), { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="truncate font-mono text-[11px] text-red-300/70" title={row.error ?? ''}>
              {row.error ?? <span className="text-zinc-700">—</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Task C — Strategic Feature Flags ---------------------------- */

function FeatureFlags({ gates }: { gates: GateConfig[] }) {
  const t = useTranslations('admin');

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="mb-1 flex items-center gap-2">
        <ToggleLeft className="h-4 w-4 text-zinc-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{t('flagsTitle')}</h2>
      </div>
      <p className="mb-4 text-[11px] text-zinc-600">{t('flagsSubtitle')}</p>

      <div className="space-y-3">
        {gates.map((g) => (
          <GateSwitch key={g.id} gate={g} />
        ))}
      </div>
    </div>
  );
}

function GateSwitch({ gate }: { gate: GateConfig }) {
  const t = useTranslations('admin');
  const toggle = useToggleGate();
  const on = gate.isEnabled;
  const Icon = on ? ShieldCheck : ShieldOff;

  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition ${
        on ? 'border-emerald-500/25 bg-emerald-500/[0.03]' : 'border-zinc-700 bg-zinc-900/40'
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 shrink-0 ${on ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <span className="text-sm font-semibold text-zinc-100">{t(`gate.${gate.id}.label`)}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              on ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-700/50 text-zinc-400'
            }`}
          >
            {on ? t('enforced') : t('bypassed')}
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{t(`gate.${gate.id}.desc`)}</p>
        <p className="mt-1.5 font-mono text-[10px] text-zinc-600">
          {t('bypassRoles')}: {gate.bypassRoles.join(', ')}
        </p>
      </div>

      <button
        onClick={() => toggle.mutate({ id: gate.id, enabled: !on })}
        disabled={toggle.isPending}
        role="switch"
        aria-checked={on}
        aria-label={t(`gate.${gate.id}.label`)}
        className="shrink-0 transition disabled:opacity-50"
      >
        {on ? (
          <ToggleRight className="h-8 w-8 text-emerald-400" />
        ) : (
          <ToggleLeft className="h-8 w-8 text-zinc-600" />
        )}
      </button>
    </div>
  );
}
