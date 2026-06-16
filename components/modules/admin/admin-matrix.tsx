'use client';
/**
 * components/modules/admin/admin-matrix.tsx
 * -------------------------------------------------------------
 * Admin → Odoo API connection matrix + integration log feed (deep-dark).
 */
import { useTranslations, useFormatter } from 'next-intl';
import { Plug, CheckCircle2, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';
import { useAdminIntegration } from '@/features/shared/queries';
import type { ConnectionStatus } from '@/types/erp';

const STATUS_META: Record<ConnectionStatus, { cls: string; icon: typeof CheckCircle2 }> = {
  connected: { cls: 'text-emerald-400 bg-emerald-500/10', icon: CheckCircle2 },
  degraded: { cls: 'text-amber-400 bg-amber-500/10', icon: AlertTriangle },
  error: { cls: 'text-red-400 bg-red-500/10', icon: XCircle },
};

const LOG_COLOR: Record<'info' | 'warn' | 'error', string> = {
  info: 'text-zinc-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
};

export function AdminMatrix() {
  const t = useTranslations('admin');
  const format = useFormatter();
  const { data, isPending, isError } = useAdminIntegration();

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
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-zinc-950 p-5 text-zinc-200 sm:p-6">
      <header className="mb-5">
        <h1 className="font-serif text-2xl text-zinc-100">{t('title')}</h1>
        <p className="text-sm text-zinc-500">{t('subtitle')}</p>
      </header>

      {/* Connection matrix */}
      <div className="mb-3 flex items-center gap-2">
        <Plug className="h-4 w-4 text-zinc-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{t('connections')}</h2>
      </div>
      <div className="mb-6 overflow-hidden rounded-xl border border-zinc-800">
        <div className="hidden grid-cols-[2fr_1fr_1.4fr_1fr] gap-3 bg-zinc-900/60 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:grid">
          <div>{t('model')}</div>
          <div>{t('status')}</div>
          <div>{t('lastSync')}</div>
          <div className="text-right">{t('records')}</div>
        </div>
        {data!.connections.map((c) => {
          const meta = STATUS_META[c.status];
          const Icon = meta.icon;
          return (
            <div
              key={c.model}
              className="grid grid-cols-2 gap-3 border-t border-zinc-800 px-4 py-3 text-sm sm:grid-cols-[2fr_1fr_1.4fr_1fr] sm:items-center"
            >
              <span className="font-mono text-zinc-200">{c.model}</span>
              <span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {t(`statusValue.${c.status}`)}
                </span>
              </span>
              <span className="text-xs text-zinc-500">
                {format.dateTime(new Date(c.lastSyncIso), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-right font-mono text-xs text-zinc-400">
                {c.recordCount.toLocaleString('en')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Logs */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">{t('logs')}</h2>
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 font-mono text-xs">
        {data!.logs.map((l, i) => (
          <div key={i} className="flex gap-3 border-b border-zinc-900 py-1.5 last:border-b-0">
            <span className="shrink-0 text-zinc-600">
              {format.dateTime(new Date(l.ts), { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className={`shrink-0 uppercase ${LOG_COLOR[l.level]}`}>{l.level}</span>
            <span className="shrink-0 text-zinc-500">{l.source}</span>
            <span className="text-zinc-300">{l.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
