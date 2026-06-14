'use client';
/**
 * components/modules/lab/ingredients-view.tsx
 * -------------------------------------------------------------
 * Raw-material catalog (recreated from the MVP). Client-side search +
 * "in stock only" toggle over the prefetched array; stock is colour-coded.
 */
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, AlertCircle, Boxes } from 'lucide-react';
import { useIngredients } from '@/features/lab/queries';

const aed = (n: number) =>
  n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kg = (n: number) => n.toLocaleString('en', { maximumFractionDigits: 1 });

export function IngredientsView() {
  const t = useTranslations('labIngredients');
  const { data, isPending, isError } = useIngredients();
  const [q, setQ] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);

  const list = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.filter((r) => {
      if (inStockOnly && !r.inStock) return false;
      if (term && !(r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term)))
        return false;
      return true;
    });
  }, [data, q, inStockOnly]);

  return (
    <section>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl text-[#1d1a17]">{t('title')}</h1>
          <p className="text-sm text-[#7a716a]">{t('subtitle')}</p>
        </div>
        {!isPending && !isError && (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#6f6457] ring-1 ring-[#e7ded3]">
            {t('count', { count: list.length })}
          </span>
        )}
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a89a8b]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-lg border border-[#e0d5c7] bg-white py-2.5 pe-3 ps-10 text-sm text-[#1d1a17] outline-none transition focus:border-[#9c6b43] focus:ring-2 focus:ring-[#9c6b43]/15"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#6f6457]">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="h-4 w-4 accent-[#9c6b43]"
          />
          {t('inStockOnly')}
        </label>
      </div>

      {isError ? (
        <div className="flex items-center gap-2 rounded-xl border border-[#e3b9ac] bg-[#f8eee9] px-4 py-3 text-sm text-[#b5462f]">
          <AlertCircle className="h-4 w-4" />
          {t('error')}
        </div>
      ) : isPending ? (
        <div className="h-72 animate-pulse rounded-xl border border-[#e7ded3] bg-white" />
      ) : list.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-[#e7ded3] bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f4ece1] text-left text-[11px] uppercase tracking-wide text-[#6a5f54]">
                <th className="px-4 py-2.5 font-semibold">{t('code')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('ingredient')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('type')}</th>
                <th className="px-4 py-2.5 text-right font-semibold">{t('cost')}</th>
                <th className="px-4 py-2.5 text-right font-semibold">{t('stock')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-[#f0e8dd] text-sm transition hover:bg-[#faf6f0]">
                  <td className="whitespace-nowrap px-4 py-2.5 text-[#9a8a78]">{r.code || '—'}</td>
                  <td className="px-4 py-2.5 text-[#1d1a17]">{r.name}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-[#f0e8dd] px-2.5 py-0.5 text-[11px] text-[#6a5f54]">
                      {r.type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[#1d1a17]">
                    {aed(r.cost)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums ${
                      r.inStock ? 'text-[#2f7d5b]' : 'text-[#b5462f]'
                    }`}
                  >
                    {kg(r.stock)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#ddd0bf] bg-white/60 py-16 text-center">
          <Boxes className="mb-3 h-8 w-8 text-[#c3b4a1]" />
          <p className="text-sm text-[#7a716a]">{t('empty')}</p>
        </div>
      )}
    </section>
  );
}
