"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Bell, Search, ShieldCheck, Menu, X, LogOut, UserRound, ChevronDown } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

const nav = [
  ["Home", "/"],
  ["Services", "/certificate"],
  ["Report Incident", "/report-incident"],
  ["Track Application", "/track"],
  ["Rankings", "/leaderboard"],
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, citizen } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const displayName = citizen?.fullName || user?.displayName || user?.email?.split("@")[0] || "Citizen";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className="sticky top-0 z-50 bg-[#f7f3ea]/95 backdrop-blur border-b border-[#ded6c9]">

      {/* Government strip */}
      <div className="gov-strip px-5 py-2 text-[11px] tracking-[.16em] uppercase flex items-center justify-center gap-2">
        <ShieldCheck size={13} />
        Official digital portal of the Ministry of Useless Affairs
      </div>

      {/* Gold rule */}
      <div className="gold-rule" />

      {/* Main navbar */}
      <div className="max-w-7xl mx-auto px-5 h-20 flex items-center justify-between gap-5">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 min-w-0 shrink-0">
          <img src="/mua-logo.png" alt="MUA" className="w-12 h-12 object-contain shrink-0" />
          <div className="min-w-0 hidden sm:block">
            <div className="font-bold text-sm tracking-wide truncate">MINISTRY OF USELESS AFFAIRS</div>
            <div className="text-[11px] text-slate-500">Department of Completely Unnecessary Governance</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold">
          {nav.map(([label, href]) => (
            <Link key={label} href={href} className="hover:text-[#6f1020] transition-colors whitespace-nowrap">
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/notifications" className="p-2 rounded-full border border-[#ded6c9] bg-white hover:bg-[#f1eee7] transition-colors relative">
            <Bell size={17} />
          </Link>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#ded6c9] bg-white hover:bg-[#f1eee7] transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[#10243d] text-[#c9a44b] grid place-items-center text-[10px] font-black shrink-0">
                  {initials}
                </div>
                <span className="text-sm font-semibold max-w-[100px] truncate">{displayName}</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-[#ded6c9] rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-[#ded6c9] bg-[#f7f3ea]">
                    <div className="text-xs font-black uppercase tracking-wider text-[#6f1020]">Citizen Portal</div>
                    <div className="text-sm font-bold mt-0.5 truncate">{displayName}</div>
                    {citizen?.citizenId && (
                      <div className="text-[10px] text-slate-500 mt-0.5">{citizen.citizenId}</div>
                    )}
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-[#f7f3ea] transition-colors"
                  >
                    <UserRound size={15} /> My Profile
                  </Link>
                  <Link
                    href="/notifications"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-[#f7f3ea] transition-colors"
                  >
                    <Bell size={15} /> Notifications
                  </Link>
                  <div className="border-t border-[#ded6c9]">
                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-[#6f1020] font-bold hover:bg-[#f3e1e3] transition-colors"
                    >
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary py-2.5 px-4">Login</Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-full border border-[#ded6c9] bg-white"
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#ded6c9] bg-[#f7f3ea] px-5 py-4 space-y-1">
          {user && (
            <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-white rounded-xl border border-[#ded6c9]">
              <div className="w-9 h-9 rounded-full bg-[#10243d] text-[#c9a44b] grid place-items-center text-xs font-black shrink-0">
                {initials}
              </div>
              <div>
                <div className="font-bold text-sm">{displayName}</div>
                {citizen?.citizenId && <div className="text-[10px] text-slate-500">{citizen.citizenId}</div>}
              </div>
            </div>
          )}
          {nav.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="block py-3 px-4 rounded-xl text-sm font-semibold hover:bg-[#efe6ce] hover:text-[#6f1020] transition-colors"
            >
              {label}
            </Link>
          ))}
          <Link href="/notifications" onClick={() => setMobileOpen(false)} className="block py-3 px-4 rounded-xl text-sm font-semibold hover:bg-[#efe6ce] transition-colors">
            Notifications
          </Link>
          <Link href="/profile" onClick={() => setMobileOpen(false)} className="block py-3 px-4 rounded-xl text-sm font-semibold hover:bg-[#efe6ce] transition-colors">
            My Profile
          </Link>
          <div className="pt-3 border-t border-[#ded6c9]">
            {user ? (
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#6f1020] text-sm font-bold text-[#6f1020] hover:bg-[#f3e1e3] transition-colors"
              >
                <LogOut size={15} /> Logout
              </button>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="btn btn-primary w-full py-3">
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
