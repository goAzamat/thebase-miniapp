'use client';
/**
 * components/modules/supply-chain/fulfillment-view.tsx
 * -------------------------------------------------------------
 * Fulfillment & Batch Logistics tracker — ultra-premium dark style.
 *   - factory load bars (capacity utilization),
 *   - end-to-end shipment tracker with a Warehouse → Customs → Transit →
 *     Delivered stepper (lucide icons), batch-number traceability, status
 *     badges and a per-shipment progress bar.
 * Data via useFulfillment (mock now, Odoo-ready shape).
 */
import { useTranslations, useFormatter } from 'next-intl';
import {
  Factory,
  Warehouse,
  FileCheck,
  Truck,
  PackageCheck,
  MapPin,
  Hash,
  Box,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import { useFulfillment } from '@/features/supply-chain/queries';
import { STAGE_ORDER, type LogisticsStage, type Shipment } from '@/features/supply-chain/schema';

const STAGE_META: Record<LogisticsStage, { icon: LucideIcon; key: string }> = {
  warehouse: { icon: Warehouse, key: 'stageWarehouse' },
  customs: { icon: FileCheck, key: 'stageCustoms' },
  transit: { icon: Truck, key: 'stageTransit' },
  delivered: { icon: PackageCheck, key: 'stageDelivered' },
};

const STATUS_COLOR: Record<LogisticsStage, string> = {
  warehouse: 'bg-[#3a2f1a] text-amber-300',
  customs: 'bg-[#3a2a1a] text-orange-300',
  transit: 'bg-[#1a2a3a] text-sky-300',
  delivered: 'bg-[#16301f] text-emerald-300',
};

function Stepper({ stage }: { stage: LogisticsStage }) {
  const t = useTranslations('fulfillment');
  const current = STAGE_ORDER.indexOf(stage);
  return (
    <div className="flex items-center">
      {STAGE_ORDER.map((s, i) => {
        const meta = STAGE_META[s];
        const Icon = meta.icon;
        const done = i <= current;
        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                  done
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                    : 'border-[#2e2620] bg-[#1c150f] text-[#5e5345]'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className={`text-[10px] ${done ? 'text-[#bcae9b]' : 'text-[#5e5345]'}`}>
                {t(meta.key)}
              </span>
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <span
                className={`mx-1 mb-4 h-0.5 w-6 sm:w-10 ${
                  i < current ? 'bg-amber-500/50' : 'bg-[#2e2620]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ShipmentRow({ s }: { s: Shipment }) {
  const t = useTranslations('fulfillment');
  const format = useFormatter();
  return (
    <div className="rounded-xl border border-[#2e2620] bg-[#1b1510] p-4 transition hover:border-[#3d3326]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Identity + traceability */}
        <div className="min-w-0 lg:w-72">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-[#f4ece1]">{s.orderNo}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[s.stage]}`}>
              {t(STAGE_META[s.stage].key)}
            </span>
          </div>
          <div className="mt-1 truncate text-sm text-[#ece3d6]">{s.productName}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#9a8a78]">
            <span className="inline-flex items-center gap-1">
              <Box className="h-3 w-3" /> {s.sku}
            </span>
            <span className="inline-flex items-center gap-1">
              <Hash className="h-3 w-3" /> {s.batchNumber}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#9a8a78]">
            <span className="truncate">{s.client}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {s.destination}
            </span>
          </div>
        </div>

        {/* Chain stepper */}
        <Stepper stage={s.stage} />

        {/* Progress + ETA */}
        <div className="lg:w-44">
          <div className="mb-1 flex items-center justify-between text-[11px] text-[#9a8a78]">
            <span>{s.qtyKg.toLocaleString('en')} kg</span>
            <span className="font-semibold text-[#bcae9b]">{s.progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#2a221a]">
            <div
              className={`h-full rounded-full ${s.stage === 'delivered' ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.max(4, s.progress)}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-[#7a6e60]">
            {t('eta')}: {format.dateTime(new Date(s.eta), { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FulfillmentView() {
  const t = useTranslations('fulfillment');
  const { data, isPending, isError } = useFulfillment();

  return (
    <section className="rounded-2xl bg-[#15110d] p-5 text-[#e9e0d3] sm:p-7">
      <header className="mb-6">
        <h1 className="font-serif text-2xl text-[#f4ece1]">{t('title')}</h1>
        <p className="text-sm text-[#9a8a78]">{t('subtitle')}</p>
      </header>

      {isError ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4" />
          {t('error')}
        </div>
      ) : isPending ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-xl bg-[#1b1510]" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-[#1b1510]" />
          ))}
        </div>
      ) : (
        <>
          {/* Factory load */}
          <div className="mb-7">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#9a8a78]">
              <Factory className="h-4 w-4" /> {t('factoryLoad')}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {data!.factories.map((f) => (
                <div key={f.name} className="rounded-xl border border-[#2e2620] bg-[#1c150f] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#ece3d6]">{f.name}</span>
                    <span className="text-[11px] text-[#7a6e60]">{f.location}</span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="font-serif text-2xl font-bold text-[#f4ece1]">{f.loadPct}%</span>
                    <span className="text-[11px] text-[#7a6e60]">{f.capacityTons} {t('capacity')}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#2a221a]">
                    <div
                      className={`h-full rounded-full ${
                        f.loadPct > 85 ? 'bg-red-500' : f.loadPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(4, f.loadPct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipment tracker */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#9a8a78]">
              {t('shipments')}
            </h2>
            <span className="rounded-full border border-[#2e2620] bg-[#1c150f] px-3 py-1 text-xs text-[#bcae9b]">
              {t('count', { count: data!.shipments.length })}
            </span>
          </div>
          <div className="space-y-3">
            {data!.shipments.map((s) => (
              <ShipmentRow key={s.id} s={s} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
