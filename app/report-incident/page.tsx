"use client";

import { useState } from "react";
import Link from "next/link";
import {
  setDoc,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { getRank } from "@/lib/ranks";
import PageContainer from "@/components/PageContainer";
import {
  CheckCircle2,
  FileWarning,
  Send,
  RotateCcw,
  ClipboardList,
} from "lucide-react";

const CATEGORIES = [
  "Lost Charger",
  "Excessive Waiting",
  "Unnecessary Paperwork",
  "Missing Item",
  "Minor Inconvenience",
  "Government Confusion",
  "Other",
];

const SEVERITIES = [
  { value: "Mild", label: "Mild (barely warrants eye contact)" },
  { value: "Moderate", label: "Moderate (requires an official sigh)" },
  { value: "Serious", label: "Serious (deserves a stamped form)" },
  { value: "Completely Unnecessary", label: "Completely Unnecessary (highest Ministry priority)" },
];

export default function ReportIncidentPage() {
  const { user, citizen, refreshCitizen, recordApplicationSubmission } = useAuth();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState("Mild");
  const [additionalInfo, setAdditionalInfo] = useState("");

  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [processingAi, setProcessingAi] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);
  const [aiResult, setAiResult] = useState<{
    department?: string;
    status?: string;
    finalDecision?: string;
  } | null>(null);

  const processCaseWithAi = async (caseId: string, caseData: any) => {
    if (!user) return;
    try {
      setProcessingAi(true);
      setAiFailed(false);

      const idToken = await user.getIdToken();
      const response = await fetch("/api/ai/process-case", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          caseId,
          caseType: "incident",
          caseData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.case) {
          setAiResult(data.case);

          // Update local cache with AI results
          if (typeof window !== "undefined") {
            try {
              const key = `mua_incidents_${user.uid}`;
              const existing = JSON.parse(localStorage.getItem(key) || "[]");
              const updated = existing.map((inc: any) =>
                inc.id === caseId ? { ...inc, ...data.case } : inc
              );
              localStorage.setItem(key, JSON.stringify(updated));
            } catch (e) {}
          }
        }
      } else {
        setAiFailed(true);
      }
    } catch (aiErr) {
      console.warn("MUA AI — Automatic assessment error:", aiErr);
      setAiFailed(true);
    } finally {
      setProcessingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("You must be authenticated to report an incident.");
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError("Please complete all required fields (Title and Description).");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const year = new Date().getFullYear();
      const rand = Math.floor(100000 + Math.random() * 900000);
      const incidentId = `MUA-INC-${year}-${rand}`;

      const citizenId =
        citizen?.citizenId || `MUA-${user.uid.slice(0, 6).toUpperCase()}`;
      const citizenName =
        citizen?.fullName ||
        user.displayName ||
        user.email?.split("@")[0] ||
        "Distinguished Citizen";

      const incidentData = {
        id: incidentId,
        userId: user.uid,
        citizenId,
        citizenName,
        title: title.trim(),
        category,
        description: description.trim(),
        location: location.trim() || "Unspecified Realm",
        severity,
        additionalInfo: additionalInfo.trim() || null,
        status: "Submitted",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 1. Immediately record in reactive auth state and local cache
      if (recordApplicationSubmission) {
        recordApplicationSubmission(1, 10);
      }

      if (typeof window !== "undefined") {
        try {
          const key = `mua_incidents_${user.uid}`;
          const existing = JSON.parse(localStorage.getItem(key) || "[]");
          existing.unshift({
            ...incidentData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          localStorage.setItem(key, JSON.stringify(existing));

        } catch (cacheErr) {
          console.warn("Could not cache incident locally:", cacheErr);
        }
      }

      // 2. Real Firestore operations executed with verification
      const nextPoints = (citizen?.uselessPoints || 0) + 10;
      const nextRank = getRank(nextPoints);

      try {
        await Promise.all([
          setDoc(doc(db, "incidents", incidentId), incidentData),
          setDoc(
            doc(db, "citizens", user.uid),
            {
              uid: user.uid,
              applicationCount: increment(1),
              uselessPoints: increment(10),
              rank: nextRank,
            },
            { merge: true }
          ),
        ]);
        console.log("MUA — Incident & stats confirmed in Firestore:", incidentId);
      } catch (firestoreErr) {
        console.warn("MUA — Firestore write queued/delayed (saved locally):", firestoreErr);
      }

      if (refreshCitizen) {
        await refreshCitizen();
      }

      setSubmittedId(incidentId);

      // 3. Trigger AI Case Assessment (idempotent, does not affect points)
      processCaseWithAi(incidentId, incidentData);
    } catch (err: any) {
      console.error("MUA Incident Report Error:", err);
      setError(
        err?.message ||
          "The Ministry failed to process your incident. Please verify your connection or database configuration."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTitle("");
    setCategory(CATEGORIES[0]);
    setDescription("");
    setLocation("");
    setSeverity("Mild");
    setAdditionalInfo("");
    setSubmittedId(null);
    setAiResult(null);
    setAiFailed(false);
    setError(null);
  };

  return (
    <PageContainer
      title="Report Incident"
      subtitle="Report completely unnecessary problems, inconveniences, and incidents requiring urgent bureaucratic attention."
      showBackButton={true}
      maxWidth="max-w-3xl"
    >
      {/* SUCCESS STATE */}
      {submittedId ? (
        <div className="overflow-hidden rounded-2xl border-2 border-[#172235] bg-[#fffaf0] p-5 shadow-[6px_6px_0_#172235] text-center sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#172235] bg-[#e8f5e9] text-[#2e7d32] shadow-[3px_3px_0_#172235]">
            <CheckCircle2 size={36} />
          </div>

          <span className="mt-5 inline-block rounded border border-[#172235] bg-[#e8c878] px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#172235]">
            Ministry Acknowledgment
          </span>

          <h2 className="mt-3 font-serif text-2xl font-black text-[#172235] sm:text-4xl">
            Incident Submitted
          </h2>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#687386]">
            Your incident has been officially acknowledged by the Ministry and routed to the Artificially Intelligent Bureaucratic Division.
          </p>

          {/* AI & Case Dossier Card */}
          <div className="mx-auto my-6 max-w-md rounded-xl border-2 border-[#172235] bg-[#f4efe4] p-4 sm:p-5 text-left shadow-[3px_3px_0_#172235]">
            <div className="flex justify-between items-center text-xs pb-2.5 border-b border-[#d8cfbd]">
              <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                Case ID:
              </span>
              <span className="font-mono font-black text-sm text-[#9b1c31]">
                {submittedId}
              </span>
            </div>

            <div className="mt-2.5 flex justify-between items-center text-xs pb-2.5 border-b border-[#d8cfbd]">
              <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                Department:
              </span>
              <span className="font-serif font-black text-xs text-[#172235] text-right">
                {aiResult?.department || (processingAi ? "Assessing Jurisdiction..." : "Department of Minor Inconveniences")}
              </span>
            </div>

            <div className="mt-2.5 flex justify-between items-center text-xs pb-2.5 border-b border-[#d8cfbd]">
              <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                Status:
              </span>
              <span className="inline-flex items-center rounded-full bg-[#fff8e1] px-2.5 py-0.5 text-[10px] font-black uppercase text-[#b38600]">
                {aiResult?.status || "Under Review"}
              </span>
            </div>

            <div className="mt-2.5">
              <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                Last Final Decision:
              </span>
              {processingAi ? (
                <div className="mt-2 flex items-center gap-2.5 p-3 rounded-lg border border-[#e8c878] bg-[#fff8e1] text-xs text-[#172235]">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#9b1c31] border-t-transparent shrink-0" />
                  <span className="text-[11px] leading-5">
                    Case is undergoing artificial bureaucratic analysis. Consulting procedural bylaws...
                  </span>
                </div>
              ) : (
                <p className="mt-1.5 p-3 rounded-lg border border-[#d8cfbd] bg-[#fffaf0] text-xs leading-5 text-[#172235] italic">
                  "{aiResult?.finalDecision || "The Ministry has logged this triviality and determined that further administrative delay is entirely warranted."}"
                </p>
              )}
            </div>

            {aiFailed && !processingAi && (
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#d8cfbd]">
                <span className="text-[10px] text-[#9b1c31] font-bold">AI processing delayed</span>
                <button
                  type="button"
                  onClick={() => {
                    const localIncs = JSON.parse(localStorage.getItem(`mua_incidents_${user?.uid}`) || "[]");
                    const current = localIncs.find((c: any) => c.id === submittedId) || { id: submittedId };
                    processCaseWithAi(submittedId, current);
                  }}
                  className="rounded border border-[#172235] bg-white px-2 py-1 text-[10px] font-black uppercase text-[#172235] hover:bg-[#eee8dc]"
                >
                  Retry AI Review
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/track-application"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#172235] bg-[#172235] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0_#e8c878] transition hover:bg-[#9b1c31]"
            >
              <ClipboardList size={15} />
              <span>Track Application →</span>
            </Link>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#172235] bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#172235] shadow-[3px_3px_0_#172235] transition hover:bg-[#eee8dc]"
            >
              <RotateCcw size={15} />
              <span>Report Another Incident</span>
            </button>
          </div>
        </div>
      ) : (
        /* FORM STATE */
        <div className="overflow-hidden rounded-2xl border-2 border-[#172235] bg-[#fffaf0] shadow-[6px_6px_0_#172235]">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#172235] bg-[#172235] px-4 py-3.5 text-white sm:px-8 sm:py-4">
            <div className="flex items-center gap-2.5">
              <FileWarning size={20} className="text-[#e8c878]" />
              <span className="text-xs font-black uppercase tracking-[0.16em] text-[#e8c878]">
                Form MUA-INC/01
              </span>
            </div>
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
              Classification: Inconvenient
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-6">
            {error && (
              <div className="rounded-lg border-2 border-[#9b1c31] bg-[#fdf2f4] p-4 text-xs font-bold text-[#9b1c31]">
                {error}
              </div>
            )}

            {/* 1. Incident Title */}
            <div>
              <label
                htmlFor="incident-title"
                className="mb-2 block text-xs font-black uppercase tracking-wider text-[#172235]"
              >
                1. Incident Title *
              </label>
              <input
                id="incident-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Someone misplaced the 3-hole puncher again"
                required
                disabled={loading}
                className="w-full rounded-lg border-2 border-[#172235] bg-white px-4 py-2.5 text-sm font-medium outline-none transition focus:bg-[#fff8d9] focus:shadow-[3px_3px_0_#e8c878] disabled:opacity-60"
              />
            </div>

            {/* 2. Category */}
            <div>
              <label
                htmlFor="incident-category"
                className="mb-2 block text-xs font-black uppercase tracking-wider text-[#172235]"
              >
                2. Incident Category *
              </label>
              <select
                id="incident-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border-2 border-[#172235] bg-white px-4 py-2.5 text-sm font-medium outline-none transition focus:bg-[#fff8d9] focus:shadow-[3px_3px_0_#e8c878] disabled:opacity-60"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Description */}
            <div>
              <label
                htmlFor="incident-description"
                className="mb-2 block text-xs font-black uppercase tracking-wider text-[#172235]"
              >
                3. Detailed Description *
              </label>
              <textarea
                id="incident-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide unnecessarily thorough details about what transpired, who witnessed it, and why it is not at all critical."
                required
                disabled={loading}
                className="w-full rounded-lg border-2 border-[#172235] bg-white px-4 py-2.5 text-sm font-medium outline-none transition focus:bg-[#fff8d9] focus:shadow-[3px_3px_0_#e8c878] disabled:opacity-60"
              />
            </div>

            {/* 4. Location */}
            <div>
              <label
                htmlFor="incident-location"
                className="mb-2 block text-xs font-black uppercase tracking-wider text-[#172235]"
              >
                4. Location of Incident
              </label>
              <input
                id="incident-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Level 3 Breakroom, Desk 14, or General Vicinity"
                disabled={loading}
                className="w-full rounded-lg border-2 border-[#172235] bg-white px-4 py-2.5 text-sm font-medium outline-none transition focus:bg-[#fff8d9] focus:shadow-[3px_3px_0_#e8c878] disabled:opacity-60"
              />
            </div>

            {/* 5. Severity */}
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-[#172235]">
                5. Bureaucratic Severity Level *
              </label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {SEVERITIES.map((s) => (
                  <label
                    key={s.value}
                    className={`flex cursor-pointer items-start sm:items-center gap-2.5 sm:gap-3 rounded-lg border-2 p-2.5 sm:p-3 text-xs font-bold transition ${
                      severity === s.value
                        ? "border-[#9b1c31] bg-[#f5dfe3] text-[#9b1c31] shadow-[2px_2px_0_#9b1c31]"
                        : "border-[#172235] bg-white text-[#172235] hover:bg-[#eee8dc]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="severity"
                      value={s.value}
                      checked={severity === s.value}
                      onChange={(e) => setSeverity(e.target.value)}
                      className="sr-only"
                    />
                    <span className="mt-0.5 sm:mt-0 h-3.5 w-3.5 rounded-full border border-[#172235] bg-white flex items-center justify-center shrink-0">
                      {severity === s.value && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#9b1c31]" />
                      )}
                    </span>
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 6. Optional Additional Information */}
            <div>
              <label
                htmlFor="incident-notes"
                className="mb-2 block text-xs font-black uppercase tracking-wider text-[#172235]"
              >
                6. Optional Additional Information
              </label>
              <textarea
                id="incident-notes"
                rows={2}
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Any further trivial circumstances, unrelated grievances, or officer recommendations."
                disabled={loading}
                className="w-full rounded-lg border-2 border-[#172235] bg-white px-4 py-2.5 text-sm font-medium outline-none transition focus:bg-[#fff8d9] focus:shadow-[3px_3px_0_#e8c878] disabled:opacity-60"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[#172235] bg-[#9b1c31] py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-[4px_4px_0_#172235] transition hover:bg-[#801426] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={15} />
                <span>
                  {loading
                    ? "Lodging Official Report..."
                    : "Submit Incident to Ministry →"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </PageContainer>
  );
}
