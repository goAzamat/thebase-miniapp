'use client';
/**
 * components/modules/supply-chain/supply-chain-view.tsx
 * -------------------------------------------------------------
 * Supply Chain shell with two tabs: the Procurement & Import Control Center
 * (default) and the existing Fulfillment tracker.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ProcurementCenter } from './procurement-center';
import { FulfillmentView } from './fulfillment-view';

export function SupplyChainView() {
  const t = useTranslations('supplyNav');
  const [tab, setTab] = useState<'procurement' | 'fulfillment'>('procurement');

  return (
    <section className="rounded-2xl bg-zinc-950 p-5 text-zinc-200 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl text-zinc-100">{t('title')}</h1>
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 text-xs font-semibold">
          {(['procurement', 'fulfillment'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1.5 transition ${
                tab === k ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t(k)}
            </button>
          ))}
        </div>
      </header>

      {tab === 'procurement' ? <ProcurementCenter /> : <FulfillmentView />}
    </section>
  );
}
