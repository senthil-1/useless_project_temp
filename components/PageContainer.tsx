"use client";

import { ReactNode } from "react";
import AuthGuard from "@/components/AuthGuard";
import AuthenticatedHeader from "@/components/AuthenticatedHeader";
import BackButton from "@/components/BackButton";

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  maxWidth?: string;
}

export default function PageContainer({
  children,
  title,
  subtitle,
  showBackButton = false,
  maxWidth = "max-w-6xl",
}: PageContainerProps) {
  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#f4efe4] text-[#172235]">
        <AuthenticatedHeader />

        <main className={`mx-auto w-full flex-1 px-3.5 py-6 sm:px-6 sm:py-10 lg:px-8 ${maxWidth}`}>
          {/* Header row with BackButton and Title if provided */}
          {(showBackButton || title) && (
            <div className="mb-6 sm:mb-8">
              {showBackButton && (
                <div className="mb-3 sm:mb-4">
                  <BackButton />
                </div>
              )}

              {title && (
                <div>
                  <h1 className="font-serif text-2xl font-black tracking-tight text-[#172235] sm:text-4xl md:text-5xl">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="mt-2 text-xs leading-5 text-[#687386] sm:text-base sm:leading-6">
                      {subtitle}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {children}
        </main>

        {/* Government Footer */}
        <footer className="mt-auto border-t-2 border-[#172235] bg-[#fffaf0] py-5 sm:py-6 text-center text-xs text-[#687386]">
          <div className="mx-auto max-w-7xl px-3 sm:px-4">
            <p className="font-bold uppercase tracking-wider text-[#172235] text-[10px] sm:text-xs">
              Ministry of Useless Affairs · Department of Completely Unnecessary Governance
            </p>
            <p className="mt-1 text-[10px] sm:text-[11px] text-[#818792]">
              All paperwork processed here is strictly official, entirely certified, and fundamentally purposeless.
            </p>
          </div>
        </footer>
      </div>
    </AuthGuard>
  );
}
