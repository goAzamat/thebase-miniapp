'use client';
/**
 * components/modules/lab/formulas-view.tsx
 * -------------------------------------------------------------
 * "Formula Finder" — recreated from the MVP prototype, now on live Odoo data
 * with server-computed costs. Client-side search over the prefetched array;
 * clean loading / empty / error states.
 */
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, AlertCircle, FlaskConical } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useFormulas } from '@/features/lab/queries';
import type { Formula } from '@/features/lab/schema';

const aed = (n: number) =>
  n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function FormulaCard({ f }: { f: Formula }) {
  const t = useTranslations('labFormulas');
  return (
    <Link
      href={`/lab/formulas/${f.id}`}
      className="relative block rounded-xl border border-[#e7ded3] bg-white p-4 transition hover:border-[#cdbba6] hover:shadow-[0_6px_18px_rgba(0,0,0,0.05)]"
    >
      <span
        className={`absolute end-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          f.inStock ? 'bg-[#e7f1eb] text-[#2f7d5b]' : 'bg-[#f6e4df] text-[#b5462f]'
        }`}
      >
        {f.inStock ? t('inStock') : t('toOrder')}
      </span>

      <div className="text-[11px] tracking-wide text-[#9a8a78]">{f.code}</div>
      <h3 className="mb-2 mt-0.5 pe-16 font-serif text-base leading-snug text-[#1d1a17]">{f.name}</h3>
      <span className="inline-block rounded-full bg-[#f0e8dd] px-2.5 py-0.5 text-[11px] text-[#6a5f54]">
        {f.category}
      </span>

      <div className="mt-3 flex gap-5 border-t border-dashed border-[#eee4d7] pt-3">
        <div>
          <div className="text-base font-bold text-[#1d1a17]">{aed(f.catalogCost)}</div>
          <div className="text-[10px] uppercase tracking-wide text-[#9a8a78]">{t('cost')}</div>
        </div>
        <div>
          <div className="text-base font-bold text-[#1d1a17]">{aed(f.price)}</div>
          <div className="text-[10px] uppercase tracking-wide text-[#9a8a78]">{t('price')}</div>
        </div>
        <div>
          <div className="text-base font-semibold text-[#7a716a]">{aed(f.recipeCost)}</div>
          <div className="text-[10px] uppercase tracking-wide text-[#9a8a78]">{t('recipeCost')}</div>
        </div>
      </div>
    </Link>
  );
}

export function FormulasView() {
  const t = useTranslations('labFormulas');
  const { data, isPending, isError } = useFormulas();
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      (f) => f.name.toLowerCase().includes(term) || f.code.toLowerCase().includes(term),
    );
  }, [data, q]);

  return (
    <section>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
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

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a89a8b]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-lg border border-[#e0d5c7] bg-white py-2.5 pe-3 ps-10 text-sm text-[#1d1a17] outline-none transition focus:border-[#9c6b43] focus:ring-2 focus:ring-[#9c6b43]/15"
        />
      </div>

      {isError ? (
        <div className="flex items-center gap-2 rounded-xl border border-[#e3b9ac] bg-[#f8eee9] px-4 py-3 text-sm text-[#b5462f]">
          <AlertCircle className="h-4 w-4" />
          {t('error')}
        </div>
      ) : isPending ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-[#e7ded3] bg-white" />
          ))}
        </div>
      ) : list.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((f) => (
            <FormulaCard key={f.id} f={f} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#ddd0bf] bg-white/60 py-16 text-center">
          <FlaskConical className="mb-3 h-8 w-8 text-[#c3b4a1]" />
          <p className="text-sm text-[#7a716a]">{t('empty')}</p>
        </div>
      )}
    </section>
  );
}
