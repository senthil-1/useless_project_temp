"use client";

import PageContainer from "@/components/PageContainer";
import ServiceCard from "@/components/ServiceCard";
import {
  FileWarning,
  Award,
  SearchCheck,
  User,
  Bell,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function CitizenPortalPage() {
  const { user, citizen } = useAuth();

  const citizenName =
    citizen?.fullName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Distinguished Citizen";

  return (
    <PageContainer
      title="Citizen Services"
      subtitle={`Welcome, ${citizenName}. This is your official administrative gateway for submitting, certifying, and monitoring completely unnecessary bureaucratic affairs. Please prepare to wait.`}
      maxWidth="max-w-6xl"
    >
      {/* Cards layout: 2x2 grid for first 4, 5th centered underneath */}
      <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
        {/* First 4 cards in 2x2 grid on desktop, 1 col on mobile */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {/* 1. REPORT INCIDENT */}
          <ServiceCard
            icon={FileWarning}
            title="Report Incident"
            description="Report completely unnecessary problems, inconveniences, and incidents requiring urgent bureaucratic attention."
            buttonLabel="Report Incident"
            href="/report-incident"
            badge="Form MUA-INC/01"
            accentColor="bg-[#f5dfe3] text-[#9b1c31]"
          />

          {/* 2. REQUEST CERTIFICATE */}
          <ServiceCard
            icon={Award}
            title="Request Certificate"
            description="Apply for official certificates proving something that probably did not need certification."
            buttonLabel="Request Certificate"
            href="/request-certificate"
            badge="Form MUA-CERT/01"
            accentColor="bg-[#fff3d6] text-[#b38600]"
          />

          {/* 3. TRACK APPLICATION */}
          <ServiceCard
            icon={SearchCheck}
            title="Track Application"
            description="Check whether your application is progressing, waiting, misplaced, escalated, or being ignored."
            buttonLabel="Track Application"
            href="/track-application"
            badge="Registry"
            accentColor="bg-[#e4ebf5] text-[#172235]"
          />

          {/* 4. CITIZEN PROFILE */}
          <ServiceCard
            icon={User}
            title="Citizen Profile"
            description="View your official Ministry identity, Citizen ID, status, rank, and submitted information."
            buttonLabel="View Profile"
            href="/citizen-profile"
            badge="Identity"
            accentColor="bg-[#eee8dc] text-[#172235]"
          />
        </div>

        {/* 5th card: MINISTRY NOTICES centered underneath on desktop */}
        <div className="flex justify-center">
          <div className="w-full md:max-w-xl">
            <ServiceCard
              icon={Bell}
              title="Ministry Notices"
              description="Read official announcements, administrative updates, and information that may or may not matter."
              buttonLabel="View Notices"
              href="/ministry-notices"
              badge="Gazette"
              accentColor="bg-[#e8c878] text-[#172235]"
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
