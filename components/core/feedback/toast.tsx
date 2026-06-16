'use client';
/**
 * components/core/feedback/toast.tsx
 * -------------------------------------------------------------
 * Minimal, dependency-free crimson notification toast. Auto-dismisses after
 * 5s. Used to surface CREDIT_LOCK_VIOLATION (and similar) gate rejections.
 */
import { useEffect } from 'react';
import { ShieldAlert, X } from 'lucide-react';

export function Toast({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const id = setTimeout(onClose, 5000);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <div className="fixed bottom-5 end-5 z-[100] w-80 max-w-[90vw] animate-[fadeIn_0.15s_ease-out] rounded-xl border border-red-500/50 bg-[#1a0f0f] p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-red-200">{title}</div>
          <div className="mt-0.5 text-xs leading-relaxed text-red-300/80">{message}</div>
        </div>
        <button onClick={onClose} aria-label="Dismiss" className="text-red-400/60 transition hover:text-red-300">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
