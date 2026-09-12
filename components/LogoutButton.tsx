"use client";

import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";

interface LogoutButtonProps {
  className?: string;
  showIcon?: boolean;
  label?: string;
}

export default function LogoutButton({
  className = "",
  showIcon = true,
  label = "Logout",
}: LogoutButtonProps) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch (error) {
      console.error("MUA Logout Error:", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`inline-flex items-center gap-1.5 rounded-lg border-2 border-[#172235] bg-[#9b1c31] px-3 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0_#172235] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#801426] hover:shadow-[2px_2px_0_#172235] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none ${className}`}
    >
      {showIcon && <LogOut size={14} />}
      <span>{label}</span>
    </button>
  );
}
