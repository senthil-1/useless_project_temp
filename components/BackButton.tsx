"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  label?: string;
  className?: string;
}

export default function BackButton({
  label = "Back",
  className = "",
}: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`inline-flex items-center gap-1.5 rounded-lg border-2 border-[#172235] bg-[#fffaf0] px-3.5 py-2 sm:py-1.5 min-h-[38px] sm:min-h-[auto] text-xs font-black uppercase tracking-wider text-[#172235] shadow-[2px_2px_0_#172235] transition hover:bg-[#eee8dc] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${className}`}
    >
      <ArrowLeft size={14} />
      <span>{label}</span>
    </button>
  );
}
