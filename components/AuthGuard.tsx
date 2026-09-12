"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [checking, setChecking] = useState(!auth.currentUser);

  useEffect(() => {
    // Firebase may already have the user available.
    if (auth.currentUser) {
      setUser(auth.currentUser);
      setChecking(false);
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setChecking(false);

        router.replace("/login");
        return;
      }

      setUser(currentUser);
      setChecking(false);
    });

    return () => unsubscribe();
  }, [router]);

  /*
   * Only show the verification screen when Firebase
   * genuinely hasn't restored the authentication state yet.
   */
  if (checking && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4efe4] px-4 sm:px-6 py-6">
        <div className="w-full max-w-md rounded-3xl border border-[#d8cfbd] bg-[#fffaf0] p-6 sm:p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-4 border-[#172235] bg-[#9b1c31] text-xs sm:text-sm font-black text-white">
            MUA
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-[#9b1c31]">
            Ministry Authentication
          </p>

          <h1 className="mt-2 text-2xl font-black text-[#172235]">
            Verifying Citizenship
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#687386]">
            Please wait while the Ministry unnecessarily verifies
            your authentication status.
          </p>

          <div className="mx-auto mt-6 h-2 w-32 overflow-hidden rounded-full bg-[#e6dece]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#9b1c31]" />
          </div>
        </div>
      </main>
    );
  }

  // If Firebase has confirmed the user, render immediately.
  if (user) {
    return <>{children}</>;
  }

  return null;
}