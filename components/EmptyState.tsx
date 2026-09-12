import { FileQuestion } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export default function EmptyState({
  title = "No Records Found",
  description = "The Ministry has checked thoroughly and, for once, found absolutely nothing.",
  actionLabel,
  onAction,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d8cfbd] bg-[#fffaf0] p-6 sm:p-10 text-center">
      <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-2 border-[#172235] bg-[#f4efe4] text-[#9b1c31] shadow-[2px_2px_0_#172235]">
        <FileQuestion size={26} />
      </div>

      <h3 className="mt-4 font-serif text-base sm:text-lg font-black text-[#172235]">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-xs leading-5 text-[#687386]">
        {description}
      </p>

      {actionLabel && actionHref && (
        <a
          href={actionHref}
          className="mt-5 inline-flex items-center justify-center min-h-[44px] rounded-lg border-2 border-[#172235] bg-[#9b1c31] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0_#172235] transition hover:bg-[#801426]"
        >
          {actionLabel}
        </a>
      )}

      {actionLabel && onAction && !actionHref && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center justify-center min-h-[44px] rounded-lg border-2 border-[#172235] bg-[#9b1c31] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0_#172235] transition hover:bg-[#801426]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
