import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string;
  buttonLabel: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  accentColor?: string;
}

export default function ServiceCard({
  title,
  description,
  buttonLabel,
  href,
  icon: Icon,
  badge,
  accentColor = "bg-[#172235] text-[#e8c878]",
}: ServiceCardProps) {
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-[#172235] bg-[#fffaf0] p-5 shadow-[5px_5px_0_#172235] transition-all duration-200 hover:-translate-y-1 hover:shadow-[7px_7px_0_#172235] sm:p-7">
      {/* Top row with icon & optional badge */}
      <div>
        <div className="flex items-center justify-between">
          <div
            className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border-2 border-[#172235] ${accentColor} shadow-[2px_2px_0_#172235]`}
          >
            <Icon size={22} className="sm:w-6 sm:h-6" />
          </div>

          {badge && (
            <span className="rounded border border-[#172235] bg-[#e8c878] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#172235]">
              {badge}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-4 sm:mt-5 font-serif text-xl sm:text-[26px] font-black text-[#172235] group-hover:text-[#9b1c31] transition-colors leading-tight">
          {title}
        </h3>

        {/* Description */}
        <p className="mt-2 text-xs leading-5 text-[#687386]">
          {description}
        </p>
      </div>

      {/* Button link */}
      <div className="mt-5 sm:mt-6 pt-4 border-t border-[#d8cfbd]">
        <Link
          href={href}
          className="inline-flex w-full min-h-[44px] items-center justify-between rounded-lg border-2 border-[#172235] bg-[#172235] px-4 py-3 sm:py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0_#e8c878] transition hover:bg-[#9b1c31] active:translate-x-[1px] active:translate-y-[1px]"
        >
          <span>{buttonLabel}</span>
          <span className="text-sm font-black transition-transform group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
