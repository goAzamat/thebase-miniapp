'use client';
/**
 * components/modules/supply-chain/procurement-center.tsx
 * -------------------------------------------------------------
 * Procurement & Import Control Center (deep-dark, high density):
 *   A. Top-20 Smart Reorder Points ledger (+ Create PR action).
 *   B. RFQ & WhatsApp template generator with negotiation tracking.
 *   C. 7-Document Import Customs Gate (Air / Sea), with critical-doc banner.
 */
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Anchor,
  Plane,
  FileCheck2,
  AlertOctagon,
  PackagePlus,
  Copy,
  Check,
  Send,
  ClipboardList,
  AlertCircle,
  Loader2,
  Boxes,
} from 'lucide-react';
import { useProcurement, useCreatePR, useAdvanceRfq } from '@/features/procurement/queries';
import { Toast } from '@/components/core/feedback/toast';
import {
  buildRfqTemplate,
  DOC_KEYS,
  RFQ_SUPPLIERS,
  type ImportShipment,
  type ReorderStatus,
  type RFQStatus,
} from '@/features/procurement/schema';

const kg = (n: number) => n.toLocaleString('en', { maximumFractionDigits: 0 });

const FLAG_STYLE: Record<ReorderStatus, string> = {
  safe: 'bg-emerald-500/10 text-emerald-400',
  reorder: 'bg-amber-500/10 text-amber-300',
  danger: 'bg-red-500/10 text-red-400',
};
const RFQ_STYLE: Record<RFQStatus, string> = {
  sent_whatsapp: 'bg-amber-500/10 text-amber-300',
  received_quote: 'bg-emerald-500/10 text-emerald-400',
  rejected: 'bg-zinc-700/40 text-zinc-400',
};

/* ----------------------------- Task A -------------------------------- */

function ReorderLedger() {
  const t = useTranslations('procurement');
  const tc = useTranslations('common');
  const { data } = useProcurement();
  const createPR = useCreatePR();
  const [lockClient, setLockClient] = useState<string | null>(null);
  const rows = data?.reorderPoints ?? [];
  const reqs = data?.requisitions ?? [];

  const hasPR = (name: string) => reqs.some((r) => r.ingredientName === name);

  return (
    <>
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-zinc-900/60 text-left text-[10px] uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-2.5 font-semibold">{t('ingredient')}</th>
            <th className="px-3 py-2.5 text-right font-semibold">{t('stockKg')}</th>
            <th className="px-3 py-2.5 text-right font-semibold">{t('avg3m')}</th>
            <th className="px-3 py-2.5 text-right font-semibold">{t('daysToStockout')}</th>
            <th className="px-3 py-2.5 font-semibold">{t('status')}</th>
            <th className="px-3 py-2.5 text-right font-semibold">{t('action')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pending = createPR.isPending && createPR.variables?.ingredientName === r.ingredientName;
            const created = hasPR(r.ingredientName);
            const suggested = Math.max(50, Math.round(r.avgMonthlyKg * 1.5));
            return (
              <tr key={r.id} className="border-t border-zinc-800 text-sm hover:bg-zinc-900/40">
                <td className="px-3 py-2 text-zinc-200">{r.ingredientName}</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {r.live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Live Odoo" />}
                    {kg(r.currentStockKg)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-500">{kg(r.avgMonthlyKg)}</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">
                  {r.daysUntilStockout >= 999 ? '∞' : r.daysUntilStockout}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${FLAG_STYLE[r.status]}`}>
                    {t(`flag.${r.status}`)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  {created ? (
                    <span className="text-[11px] text-zinc-500">{t('prPending')}</span>
                  ) : (
                    <button
                      onClick={() =>
                        createPR.mutate(
                          { ingredientName: r.ingredientName, requestedQtyKg: suggested, sku: r.sku },
                          { onError: (e: unknown) => setLockClient((e as { client?: string })?.client ?? '') },
                        )
                      }
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <PackagePlus className="h-3 w-3" />}
                      {t('createPR')}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    {lockClient && (
      <Toast
        title={tc('creditLockTitle')}
        message={tc('creditLockMsg', { client: lockClient })}
        onClose={() => setLockClient(null)}
      />
    )}
    </>
  );
}

/* ----------------------------- Task B -------------------------------- */

function RfqGenerator() {
  const t = useTranslations('procurement');
  const { data } = useProcurement();
  const advance = useAdvanceRfq();
  const ingredients = useMemo(() => (data?.reorderPoints ?? []).map((r) => r.ingredientName), [data]);

  const [ingredient, setIngredient] = useState('');
  const [supplier, setSupplier] = useState(RFQ_SUPPLIERS[0]);
  const [qty, setQty] = useState(500);
  const [price, setPrice] = useState(100);
  const [copied, setCopied] = useState(false);

  const ing = ingredient || ingredients[0] || 'Ingredient';
  const template = buildRfqTemplate(supplier, ing, qty, price);

  function copy() {
    navigator.clipboard?.writeText(template).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {/* generator */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="text-[11px] text-zinc-500">
            {t('ingredient')}
            <select
              value={ingredient}
              onChange={(e) => setIngredient(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
            >
              {ingredients.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-zinc-500">
            {t('supplier')}
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
            >
              {RFQ_SUPPLIERS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-zinc-500">
            {t('qtyKg')}
            <input type="number" value={qty} onChange={(e) => setQty(+e.target.value)} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200" />
          </label>
          <label className="text-[11px] text-zinc-500">
            {t('targetPrice')}
            <input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200" />
          </label>
        </div>
        <pre className="max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">{template}</pre>
        <button
          onClick={copy}
          className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? t('copied') : t('copyRfq')}
        </button>
      </div>

      {/* tracking */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">{t('rfqTracking')}</h3>
        <div className="space-y-2">
          {(data?.rfqs ?? []).map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
              <Send className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-zinc-200">{r.supplierName} · {r.ingredientName}</div>
                <div className="text-[10px] text-zinc-500">AED {r.targetPriceAed}/kg</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${RFQ_STYLE[r.status]}`}>
                {t(`rfqStatus.${r.status}`)}
              </span>
              {r.status === 'sent_whatsapp' && (
                <button
                  onClick={() => advance.mutate({ id: r.id, status: 'received_quote' })}
                  className="shrink-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
                >
                  {t('logQuote')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Task C -------------------------------- */

function DocGrid({ shipment }: { shipment: ImportShipment }) {
  const t = useTranslations('procurement');
  return (
    <div className="flex flex-wrap gap-1.5">
      {DOC_KEYS.map(({ key, code }) => {
        const ok = shipment.documents[key];
        return (
          <span
            key={code}
            title={t(`docNames.${code.toLowerCase()}`)}
            className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
              ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}
          >
            {code}
          </span>
        );
      })}
    </div>
  );
}

function ShipmentCard({ shipment }: { shipment: ImportShipment }) {
  const t = useTranslations('procurement');
  const Icon = shipment.mode === 'air' ? Plane : Anchor;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-zinc-100">
            <Icon className="h-4 w-4 text-amber-500" /> {shipment.id}
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">{shipment.supplier}</div>
        </div>
        <div className="text-right">
          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase text-zinc-300">
            {t(`shipStatus.${shipment.status}`)}
          </span>
          <div className="mt-1 text-[10px] text-zinc-600">
            {shipment.etaDays === 0 ? t('arrived') : `ETA ${shipment.etaDays}d`}
          </div>
        </div>
      </div>
      <div className="mb-3 text-[11px] text-zinc-500">
        {shipment.carrier} · {shipment.trackingNumber}
      </div>
      <DocGrid shipment={shipment} />
    </div>
  );
}

/* --------------------------- Container ------------------------------- */

export function ProcurementCenter() {
  const t = useTranslations('procurement');
  const { data, isPending, isError } = useProcurement();

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        <AlertCircle className="h-4 w-4" /> {t('error')}
      </div>
    );
  }
  if (isPending) {
    return (
      <div className="space-y-3">
        <div className="h-64 animate-pulse rounded-xl bg-zinc-900" />
        <div className="h-48 animate-pulse rounded-xl bg-zinc-900" />
      </div>
    );
  }

  const air = data!.shipments.filter((s) => s.mode === 'air');
  const sea = data!.shipments.filter((s) => s.mode === 'sea');
  const critical = data!.shipments.filter(
    (s) => s.status !== 'arrived' && s.etaDays <= 3 && !s.documents.healthCertificate,
  );

  return (
    <div className="space-y-7">
      {/* Critical customs banner */}
      {critical.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {t('hcWarning', { count: critical.length })}{' '}
            <span className="font-mono text-red-200">{critical.map((s) => s.id).join(', ')}</span>
          </span>
        </div>
      )}

      {/* Task A */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          <Boxes className="h-4 w-4" /> {t('reorderTitle')}
        </h2>
        <ReorderLedger />
      </section>

      {/* Task B */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          <ClipboardList className="h-4 w-4" /> {t('rfqTitle')}
        </h2>
        <RfqGenerator />
      </section>

      {/* Task C */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          <FileCheck2 className="h-4 w-4" /> {t('importTitle')}
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-400">
              <Plane className="h-4 w-4 text-sky-400" /> {t('airFreight')}
            </div>
            <div className="space-y-3">
              {air.map((s) => <ShipmentCard key={s.id} shipment={s} />)}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-400">
              <Anchor className="h-4 w-4 text-cyan-400" /> {t('seaFreight')}
            </div>
            <div className="space-y-3">
              {sea.map((s) => <ShipmentCard key={s.id} shipment={s} />)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
