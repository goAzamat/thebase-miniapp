'use client';
/**
 * components/modules/sales/pipeline-view.tsx
 * -------------------------------------------------------------
 * Sales pipeline — CRM leads as modern cards. Built from the same Core
 * primitives and patterns as the Lab views (copy-paste consistency).
 */
import { useTranslations } from 'next-intl';
import { Building2, TrendingUp, AlertCircle } from 'lucide-react';
import { useActiveLeads } from '@/features/sales/queries';
import type { Lead } from '@/features/sales/schema';

const money = (n: number) =>
  n.toLocaleString('en', { maximumFractionDigits: 0 });

function LeadCard({ lead }: { lead: Lead }) {
  const t = useTranslations('sales');
  const pct = Math.max(0, Math.min(100, Math.round(lead.probability)));
  return (
    <div className="rounded-xl border border-[#e7ded3] bg-white p-4 transition hover:border-[#cdbba6] hover:shadow-[0_6px_18px_rgba(0,0,0,0.05)]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-serif text-base leading-snug text-[#1d1a17]">{lead.name}</h3>
        {lead.stage && (
          <span className="shrink-0 rounded-full bg-[#e7eef6] px-2.5 py-0.5 text-[11px] font-semibold text-[#2f5d8a]">
            {lead.stage}
          </span>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2 text-xs text-[#6f6457]">
        <Building2 className="h-3.5 w-3.5 text-[#a89a8b]" />
        <span>{lead.partner ?? t('noPartner')}</span>
      </div>

      <div className="flex items-end justify-between border-t border-dashed border-[#eee4d7] pt-3">
        <div>
          <div className="flex items-center gap-1 text-lg font-bold text-[#1d1a17]">
            <TrendingUp className="h-4 w-4 text-[#2f7d5b]" />
            {money(lead.revenue)}
            <span className="text-xs font-medium text-[#9a8a78]">AED</span>
          </div>
          <div className="text-[10px] uppercase tracking-wide text-[#9a8a78]">{t('revenue')}</div>
        </div>
        <div className="w-24">
          <div className="mb-1 flex justify-between text-[10px] text-[#9a8a78]">
            <span>{t('probability')}</span>
            <span className="font-semibold text-[#6f6457]">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#efe6da]">
            <div className="h-full rounded-full bg-[#9c6b43]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PipelineView() {
  const t = useTranslations('sales');
  const { data, isPending, isError } = useActiveLeads();

  return (
    <section>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl text-[#1d1a17]">{t('title')}</h1>
          <p className="text-sm text-[#7a716a]">{t('subtitle')}</p>
        </div>
        {!isPending && !isError && (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#6f6457] ring-1 ring-[#e7ded3]">
            {t('count', { count: data?.length ?? 0 })}
          </span>
        )}
      </header>

      {isError ? (
        <div className="flex items-center gap-2 rounded-xl border border-[#e3b9ac] bg-[#f8eee9] px-4 py-3 text-sm text-[#b5462f]">
          <AlertCircle className="h-4 w-4" />
          {t('error')}
        </div>
      ) : isPending ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border border-[#e7ded3] bg-white" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((l) => (
            <LeadCard key={l.id} lead={l} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#ddd0bf] bg-white/60 py-16 text-center">
          <TrendingUp className="mb-3 h-8 w-8 text-[#c3b4a1]" />
          <p className="text-sm text-[#7a716a]">{t('empty')}</p>
        </div>
      )}
    </section>
  );
}
