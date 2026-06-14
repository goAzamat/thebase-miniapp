'use client';
/**
 * components/modules/lab/briefs-view.tsx
 * -------------------------------------------------------------
 * Client view for Lab "Client Briefs". Reads from React Query (hydrated by
 * the server on first paint), and renders modern status badges with clean
 * loading / empty / error states.
 */
import { useTranslations, useFormatter } from 'next-intl';
import { CalendarClock, User, Star, FlaskConical, AlertCircle } from 'lucide-react';
import { useLabBriefs } from '@/features/lab/queries';
import type { LabBrief } from '@/features/lab/schema';

/** Map an Odoo stage name to a badge palette. */
function stageClasses(stage: string | null): string {
  const s = (stage ?? '').toLowerCase();
  if (/new|backlog|inbox|to ?do/.test(s)) return 'bg-[#e7eef6] text-[#2f5d8a]';
  if (/progress|doing|wip|develop/.test(s)) return 'bg-[#fcf0db] text-[#9a6b16]';
  if (/review|test|sample|tasting/.test(s)) return 'bg-[#efe7f6] text-[#6b4a9a]';
  if (/done|approved|closed|complete|launch/.test(s)) return 'bg-[#e7f1eb] text-[#2f7d5b]';
  return 'bg-[#f0e8dd] text-[#6a5f54]';
}

function BriefCard({ brief }: { brief: LabBrief }) {
  const t = useTranslations('lab');
  const format = useFormatter();
  const deadline = brief.deadline
    ? format.dateTime(new Date(brief.deadline), { year: 'numeric', month: 'short', day: 'numeric' })
    : t('noDeadline');

  return (
    <div className="group relative rounded-xl border border-[#e7ded3] bg-white p-4 transition hover:border-[#cdbba6] hover:shadow-[0_6px_18px_rgba(0,0,0,0.05)]">
      {brief.priority === 'high' && (
        <span
          title={t('priorityHigh')}
          className="absolute end-3 top-3 text-[#d39a3f]"
        >
          <Star className="h-4 w-4 fill-current" />
        </span>
      )}

      <h3 className="mb-3 pe-6 font-serif text-base leading-snug text-[#1d1a17]">
        {brief.name}
      </h3>

      <span
        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${stageClasses(
          brief.stage,
        )}`}
      >
        {brief.stage ?? '—'}
      </span>

      <div className="mt-4 space-y-1.5 border-t border-dashed border-[#eee4d7] pt-3 text-xs text-[#6f6457]">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5 text-[#a89a8b]" />
          <span>
            {t('deadline')}: {deadline}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-[#a89a8b]" />
          <span>{brief.owner ?? t('unassigned')}</span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[#e7ded3] bg-white p-4">
      <div className="mb-3 h-4 w-3/4 animate-pulse rounded bg-[#efe6da]" />
      <div className="mb-4 h-5 w-20 animate-pulse rounded-full bg-[#efe6da]" />
      <div className="space-y-2 border-t border-dashed border-[#eee4d7] pt-3">
        <div className="h-3 w-1/2 animate-pulse rounded bg-[#efe6da]" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-[#efe6da]" />
      </div>
    </div>
  );
}

export function LabBriefsView() {
  const t = useTranslations('lab');
  const { data, isPending, isError } = useLabBriefs();

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
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((b) => (
            <BriefCard key={b.id} brief={b} />
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
