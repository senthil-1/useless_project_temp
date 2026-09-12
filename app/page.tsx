"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingState from "@/components/LoadingState";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/citizen-portal");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4efe4]">
      <LoadingState message="Redirecting to official citizen portal..." />
    </div>
  );
}
