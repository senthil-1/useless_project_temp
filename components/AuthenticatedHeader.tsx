"use client";

import Link from "next/link";
import { ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import LogoutButton from "@/components/LogoutButton";
import { getRank } from "@/lib/ranks";

export default function AuthenticatedHeader() {
  const { user, citizen } = useAuth();

  const displayName =
    citizen?.fullName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Distinguished Citizen";

  const citizenId = citizen?.citizenId || (user ? `MUA-${user.uid.slice(0, 6).toUpperCase()}` : "Pending");
  const rank = getRank(citizen?.uselessPoints ?? 0);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-[#172235] bg-[#fffaf0] shadow-sm">
      {/* Top government strip */}
      <div className="flex h-7 items-center justify-center bg-[#172235] px-2 sm:px-4 text-center text-[8px] sm:text-[9px] font-black uppercase tracking-[0.08em] sm:tracking-[0.2em] text-[#e8c878]">
        <ShieldCheck size={12} className="mr-1.5 shrink-0" />
        <span className="truncate">Official Citizen Service Portal · Republic of Questionable Decisions</span>
      </div>

      <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* LEFT: Branding */}
        <Link
          href="/citizen-portal"
          className="flex items-center gap-2 sm:gap-3 min-w-0 transition-opacity hover:opacity-90"
        >
          <img
            src="/mua-logo.png"
            alt="Ministry of Useless Affairs"
            className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="font-serif text-[13px] sm:text-base lg:text-lg font-black tracking-normal sm:tracking-wide text-[#172235] leading-tight truncate">
              MINISTRY OF USELESS AFFAIRS
            </p>
            <p className="truncate text-[8.5px] sm:text-[10px] font-bold uppercase tracking-[0.08em] sm:tracking-[0.14em] text-[#9b1c31]">
              Department of Completely Unnecessary Governance
            </p>
          </div>
        </Link>

        {/* RIGHT: User info & Logout */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Citizen Info Badge */}
          <Link
            href="/citizen-profile"
            className="hidden items-center gap-2.5 rounded-lg border-2 border-[#172235] bg-[#f4efe4] px-3 py-1.5 transition hover:bg-[#eee8dc] sm:flex"
            title="View Citizen Profile"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#172235] text-[11px] font-black text-[#e8c878]">
              <User size={14} />
            </div>
            <div className="text-left">
              <p className="max-w-[130px] truncate text-xs font-black text-[#172235] lg:max-w-[170px]">
                {displayName}
              </p>
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#687386]">
                <span className="font-mono text-[#9b1c31]">{citizenId}</span>
                <span>•</span>
                <span className="truncate">{rank}</span>
              </div>
            </div>
          </Link>

          {/* Clearly visible Red Logout Button */}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
