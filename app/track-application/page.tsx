"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import PageContainer from "@/components/PageContainer";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import {
  FileWarning,
  Award,
  Search,
  ExternalLink,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Download,
  RotateCcw,
  Sparkles,
  Building2,
  FileText,
} from "lucide-react";

interface ApplicationItem {
  id: string;
  type: "incident" | "certificate";
  typeLabel: string;
  title: string;
  categoryOrPurpose: string;
  status: string;
  department?: string;
  finalDecision?: string;
  certificateTitle?: string;
  certificateValue?: string;
  aiProcessed?: boolean;
  createdAt: any;
  raw: any;
}

export default function TrackApplicationPage() {
  const { user } = useAuth();

  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [filter, setFilter] = useState<"all" | "incident" | "certificate">("all");

  // Certificate Modal State
  const [activeCertApp, setActiveCertApp] = useState<ApplicationItem | null>(null);
  const [certImageUrl, setCertImageUrl] = useState<string | null>(null);
  const [certLoading, setCertLoading] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);

  // Retry AI State
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchApplications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const items: ApplicationItem[] = [];

      // 1. Fetch from Firestore incidents & certificateRequests in parallel
      const incPromise = getDocs(
        query(collection(db, "incidents"), where("userId", "==", user.uid))
      ).catch((err) => {
        console.warn("Could not fetch incidents from Firestore:", err);
        return null;
      });

      const certPromise = getDocs(
        query(collection(db, "certificateRequests"), where("userId", "==", user.uid))
      ).catch((err) => {
        console.warn("Could not fetch certificate requests from Firestore:", err);
        return null;
      });

      const [incSnap, certSnap] = await Promise.all([incPromise, certPromise]);

      if (incSnap) {
        incSnap.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: data.id || docSnap.id,
            type: "incident",
            typeLabel: "Incident Report",
            title: data.title || "Untitled Incident",
            categoryOrPurpose: data.category || "General",
            status: data.status || "Submitted",
            department: data.department || "Department of Minor Inconveniences",
            finalDecision: data.finalDecision || "",
            certificateTitle: data.certificateTitle || "",
            certificateValue: data.certificateValue || "",
            aiProcessed: data.aiProcessed !== false,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            raw: data,
          });
        });
      }

      if (certSnap) {
        certSnap.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: data.id || docSnap.id,
            type: "certificate",
            typeLabel: "Certificate Request",
            title: data.certificateRequest || data.certificateTitle || data.certificateType || "Official Certificate",
            categoryOrPurpose: data.purpose || "Unspecified",
            status: data.status || "Submitted",
            department: data.department || "Department of Bureaucratic Affairs",
            finalDecision: data.finalDecision || "",
            certificateTitle: data.certificateTitle || data.certificateRequest || data.certificateType || "Certificate of Bureaucratic Excellence",
            certificateValue: data.certificateValue || "EXTRAORDINARY BUREAUCRATIC RECOGNITION",
            aiProcessed: data.aiProcessed !== false,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            raw: data,
          });
        });
      }

      // 2. Also merge any locally cached submissions seamlessly (deduplicated by ID)
      if (typeof window !== "undefined") {
        try {
          const localInc = JSON.parse(
            localStorage.getItem(`mua_incidents_${user.uid}`) || "[]"
          );
          localInc.forEach((inc: any) => {
            const existingIdx = items.findIndex((it) => it.id === inc.id);
            if (existingIdx === -1) {
              items.push({
                id: inc.id,
                type: "incident",
                typeLabel: "Incident Report",
                title: inc.title || "Untitled Incident",
                categoryOrPurpose: inc.category || "General",
                status: inc.status || "Submitted",
                department: inc.department || "Department of Minor Inconveniences",
                finalDecision: inc.finalDecision || "",
                certificateTitle: inc.certificateTitle || "",
                certificateValue: inc.certificateValue || "",
                aiProcessed: inc.aiProcessed !== false,
                createdAt: inc.createdAt ? new Date(inc.createdAt) : new Date(),
                raw: inc,
              });
            } else if (inc.aiProcessed && !items[existingIdx].finalDecision) {
              // Upgrade with local AI evaluation if available
              items[existingIdx] = {
                ...items[existingIdx],
                ...inc,
                createdAt: items[existingIdx].createdAt,
              };
            }
          });

          const localCert = JSON.parse(
            localStorage.getItem(`mua_certificates_${user.uid}`) || "[]"
          );
          localCert.forEach((cert: any) => {
            const existingIdx = items.findIndex((it) => it.id === cert.id);
            if (existingIdx === -1) {
              items.push({
                id: cert.id,
                type: "certificate",
                typeLabel: "Certificate Request",
                title: cert.certificateRequest || cert.certificateTitle || cert.certificateType || "Official Certificate",
                categoryOrPurpose: cert.purpose || "Unspecified",
                status: cert.status || "Submitted",
                department: cert.department || "Department of Bureaucratic Affairs",
                finalDecision: cert.finalDecision || "",
                certificateTitle: cert.certificateTitle || cert.certificateRequest || cert.certificateType || "Certificate of Bureaucratic Excellence",
                certificateValue: cert.certificateValue || "EXTRAORDINARY BUREAUCRATIC RECOGNITION",
                aiProcessed: cert.aiProcessed !== false,
                createdAt: cert.createdAt ? new Date(cert.createdAt) : new Date(),
                raw: cert,
              });
            } else if (cert.aiProcessed && !items[existingIdx].finalDecision) {
              items[existingIdx] = {
                ...items[existingIdx],
                ...cert,
                createdAt: items[existingIdx].createdAt,
              };
            }
          });
        } catch (localErr) {
          console.warn("Could not read local application cache:", localErr);
        }
      }

      // Sort descending by date
      items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setApplications(items);
    } catch (err: any) {
      console.error("MUA Track Applications Error:", err);
      setError(
        err?.message ||
          "Unable to fetch applications from Ministry records. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [user]);

  // Handle Retry AI Processing
  const handleRetryAi = async (app: ApplicationItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;

    try {
      setRetryingId(app.id);
      const idToken = await user.getIdToken();

      const response = await fetch("/api/ai/process-case", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          caseId: app.id,
          caseType: app.type,
          caseData: app.raw,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.case) {
          const updated = {
            ...app,
            ...data.case,
            aiProcessed: true,
          };

          setApplications((prev) =>
            prev.map((item) => (item.id === app.id ? updated : item))
          );

          if (selectedApp?.id === app.id) {
            setSelectedApp(updated);
          }

          // Update local cache
          const key = app.type === "incident" ? `mua_incidents_${user.uid}` : `mua_certificates_${user.uid}`;
          try {
            const existing = JSON.parse(localStorage.getItem(key) || "[]");
            const merged = existing.map((it: any) =>
              it.id === app.id ? { ...it, ...data.case } : it
            );
            localStorage.setItem(key, JSON.stringify(merged));
          } catch {}
        }
      } else {
        alert("The Ministry's AI processing division is currently preoccupied. Please try again.");
      }
    } catch (err) {
      console.error("Retry AI Error:", err);
      alert("Failed to reach the AI Bureau. Please verify your connection.");
    } finally {
      setRetryingId(null);
    }
  };

  // Handle Certificate Generation
  const handleOpenCertificate = async (app: ApplicationItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;

    try {
      setActiveCertApp(app);
      setCertLoading(true);
      setCertError(null);
      setCertImageUrl(null);

      const idToken = await user.getIdToken();
      const citizenName = user.displayName || user.email?.split("@")[0] || "Distinguished Citizen";
      const certVal = app.certificateValue || "EXTRAORDINARY BUREAUCRATIC PATIENCE";

      const url = `/api/certificate/generate?caseId=${encodeURIComponent(
        app.id
      )}&caseType=${app.type}&citizenName=${encodeURIComponent(
        citizenName
      )}&certificateValue=${encodeURIComponent(certVal)}&token=${encodeURIComponent(idToken)}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to generate certificate: ${response.statusText}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setCertImageUrl(objectUrl);
    } catch (err: any) {
      console.error("Certificate load error:", err);
      setCertError(err.message || "Could not generate certificate preview.");
    } finally {
      setCertLoading(false);
    }
  };

  const handleDownloadCertificate = () => {
    if (!certImageUrl || !activeCertApp) return;
    const a = document.createElement("a");
    a.href = certImageUrl;
    a.download = `MUA-Certificate-${activeCertApp.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredApps = applications.filter((app) => {
    if (filter === "all") return true;
    return app.type === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#2e7d32] bg-[#e8f5e9] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#2e7d32]">
            <CheckCircle2 size={11} /> {status}
          </span>
        );
      case "escalated":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#b71c1c] bg-[#ffebee] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#b71c1c]">
            <ShieldAlert size={11} /> Escalated
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#c62828] bg-[#fdf2f4] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#c62828]">
            <AlertCircle size={11} /> Rejected
          </span>
        );
      case "under review":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#b38600] bg-[#fff8e1] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#b38600]">
            <Clock size={11} /> Under Review
          </span>
        );
      case "submitted":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#172235] bg-[#e3f2fd] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#1565c0]">
            <Clock size={11} /> {status || "Submitted"}
          </span>
        );
    }
  };

  return (
    <PageContainer
      title="Track Application"
      subtitle="Check whether your application is progressing, waiting, misplaced, escalated, or being evaluated by the Ministry's AI division."
      showBackButton={true}
      maxWidth="max-w-5xl"
    >
      {/* FILTER BUTTONS */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {(
            [
              ["all", "All Applications"],
              ["incident", "Incident Reports"],
              ["certificate", "Certificate Requests"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-lg border-2 px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-black uppercase tracking-wider transition ${
                filter === key
                  ? "border-[#172235] bg-[#172235] text-white shadow-[2px_2px_0_#e8c878]"
                  : "border-[#172235] bg-[#fffaf0] text-[#172235] hover:bg-[#eee8dc]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="text-xs font-bold text-[#687386]">
          Total Filed:{" "}
          <span className="font-mono font-black text-[#172235]">
            {filteredApps.length}
          </span>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="mb-6 rounded-xl border-2 border-[#9b1c31] bg-[#fdf2f4] p-4 text-xs font-bold text-[#9b1c31]">
          {error}
        </div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <LoadingState message="Retrieving dossier records from Ministry archives..." />
      ) : filteredApps.length === 0 ? (
        /* EMPTY STATE */
        <EmptyState
          title="No Applications Found"
          description="The Ministry has checked thoroughly and, for once, found absolutely nothing."
          actionLabel="Report an Incident →"
          actionHref="/report-incident"
        />
      ) : (
        /* APPLICATIONS DOSSIER CARDS */
        <div className="space-y-4">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className="overflow-hidden rounded-2xl border-2 border-[#172235] bg-[#fffaf0] shadow-[4px_4px_0_#172235] transition hover:shadow-[6px_6px_0_#172235] cursor-pointer"
            >
              {/* Card Header Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#172235] bg-[#172235] px-4 py-2 sm:px-6 sm:py-2.5 text-white">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-black text-[#e8c878] break-all">
                    {app.id}
                  </span>
                  <span className="text-[10px] text-white/50">•</span>
                  <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                    {app.typeLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-[10px] font-bold text-white/60">
                    {app.createdAt instanceof Date
                      ? app.createdAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Recent"}
                  </span>
                  {getStatusBadge(app.status)}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-6 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-lg font-black text-[#172235]">
                      {app.title}
                    </h3>
                    <p className="text-xs text-[#687386] mt-0.5">
                      {app.categoryOrPurpose}
                    </p>
                  </div>

                  {/* Department Badge */}
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8cfbd] bg-[#f4efe4] px-2.5 py-1 text-[10px] font-black text-[#172235] shrink-0 self-start">
                    <Building2 size={12} className="text-[#9b1c31]" />
                    <span>{app.department || "Department of Minor Inconveniences"}</span>
                  </div>
                </div>

                {/* Certificate Specific Fields */}
                {app.type === "certificate" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-[#d8cfbd] bg-[#f4efe4]/60 p-3 text-xs">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#687386]">
                        Certificate Title:
                      </span>
                      <p className="font-serif font-bold text-[#172235] mt-0.5">
                        {app.certificateTitle || app.title}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#687386]">
                        Awarded Value:
                      </span>
                      <p className="font-serif font-black text-[#9b1c31] mt-0.5 tracking-wide">
                        {app.certificateValue || "EXTRAORDINARY BUREAUCRATIC PATIENCE"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Last Final Decision Snippet */}
                {app.finalDecision ? (
                  <div className="rounded-lg border border-[#d8cfbd] bg-[#f4efe4] p-3">
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#687386] block mb-1">
                      Last Final Decision:
                    </span>
                    <p className="text-xs italic leading-5 text-[#172235]">
                      "{app.finalDecision}"
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#e8c878] bg-[#fff8e1] p-3 text-xs text-[#172235] flex items-center justify-between">
                    <span className="italic">
                      Case awaiting official AI classification.
                    </span>
                    <button
                      type="button"
                      disabled={retryingId === app.id}
                      onClick={(e) => handleRetryAi(app, e)}
                      className="inline-flex items-center gap-1 rounded border border-[#172235] bg-white px-2 py-1 text-[10px] font-black uppercase text-[#172235] hover:bg-[#eee8dc] disabled:opacity-50"
                    >
                      <RotateCcw size={10} className={retryingId === app.id ? "animate-spin" : ""} />
                      <span>{retryingId === app.id ? "Evaluating..." : "Process with AI"}</span>
                    </button>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-t border-[#d8cfbd]">
                  <span className="text-[10px] font-bold text-[#687386]">
                    Click card to view full administrative dossier
                  </span>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Retry AI button if failed */}
                    {app.aiProcessed === false && (
                      <button
                        type="button"
                        disabled={retryingId === app.id}
                        onClick={(e) => handleRetryAi(app, e)}
                        className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 rounded-lg border-2 border-[#9b1c31] bg-[#fdf2f4] px-3 py-2 sm:py-1.5 text-xs font-black uppercase tracking-wider text-[#9b1c31] shadow-[2px_2px_0_#9b1c31] hover:bg-[#f5dfe3] min-h-[38px] sm:min-h-[auto]"
                      >
                        <RotateCcw size={12} className={retryingId === app.id ? "animate-spin" : ""} />
                        <span>{retryingId === app.id ? "Retrying..." : "Retry AI Processing"}</span>
                      </button>
                    )}

                    {/* Generate Certificate Button for Certificates or Approved Cases */}
                    {(app.type === "certificate" || app.status.toLowerCase() === "approved") && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenCertificate(app, e)}
                        className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 rounded-lg border-2 border-[#172235] bg-[#172235] px-3.5 py-2 sm:py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0_#e8c878] transition hover:bg-[#9b1c31] min-h-[38px] sm:min-h-[auto]"
                      >
                        <Award size={13} className="text-[#e8c878]" />
                        <span>Generate Certificate</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL DOSSIER MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border-2 border-[#172235] bg-[#fffaf0] shadow-[10px_10px_0_#172235] max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-[#172235] bg-[#172235] px-4 py-3.5 sm:px-6 sm:py-4 text-white shrink-0">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e8c878]">
                  Official Case Dossier
                </span>
                <p className="font-mono text-sm font-black text-white break-all">
                  {selectedApp.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="rounded-lg border border-white/20 p-1.5 text-white transition hover:bg-white/10 shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-4 text-xs flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                  Status:
                </span>
                {getStatusBadge(selectedApp.status)}
              </div>

              <div className="border-t border-[#d8cfbd] pt-3">
                <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                  Jurisdiction:
                </span>
                <p className="font-serif text-sm font-black text-[#172235] mt-0.5">
                  {selectedApp.department || "Department of Bureaucratic Affairs"}
                </p>
              </div>

              <div className="border-t border-[#d8cfbd] pt-3">
                <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                  Title / Subject:
                </span>
                <p className="font-serif text-base font-black text-[#172235] mt-0.5">
                  {selectedApp.title}
                </p>
              </div>

              {selectedApp.finalDecision && (
                <div className="border-t border-[#d8cfbd] pt-3">
                  <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                    Last Final Decision:
                  </span>
                  <p className="mt-1 leading-5 text-[#172235] italic bg-[#f4efe4] p-3 rounded-lg border border-[#d8cfbd]">
                    "{selectedApp.finalDecision}"
                  </p>
                </div>
              )}

              {selectedApp.type === "incident" ? (
                <>
                  <div className="border-t border-[#d8cfbd] pt-3">
                    <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                      Category:
                    </span>
                    <p className="font-bold text-[#172235] mt-0.5">
                      {selectedApp.raw?.category || "N/A"}
                    </p>
                  </div>

                  <div className="border-t border-[#d8cfbd] pt-3">
                    <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                      Severity:
                    </span>
                    <p className="font-bold text-[#9b1c31] mt-0.5">
                      {selectedApp.raw?.severity || "Mild"}
                    </p>
                  </div>

                  <div className="border-t border-[#d8cfbd] pt-3">
                    <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                      Location:
                    </span>
                    <p className="text-[#172235] mt-0.5">
                      {selectedApp.raw?.location || "Unspecified"}
                    </p>
                  </div>

                  <div className="border-t border-[#d8cfbd] pt-3">
                    <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                      Description:
                    </span>
                    <p className="mt-1 leading-5 text-[#172235] whitespace-pre-wrap bg-[#f4efe4] p-3 rounded-lg border border-[#d8cfbd]">
                      {selectedApp.raw?.description || "No description."}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="border-t border-[#d8cfbd] pt-3">
                    <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                      Requested Certificate Concept:
                    </span>
                    <p className="font-medium text-xs text-[#172235] mt-0.5">
                      {selectedApp.raw?.certificateRequest || selectedApp.raw?.certificateType || selectedApp.title}
                    </p>
                  </div>

                  <div className="border-t border-[#d8cfbd] pt-3">
                    <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                      Certificate Title:
                    </span>
                    <p className="font-serif text-sm font-black text-[#172235] mt-0.5">
                      {selectedApp.certificateTitle || selectedApp.title}
                    </p>
                  </div>

                  <div className="border-t border-[#d8cfbd] pt-3">
                    <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                      Awarded Value:
                    </span>
                    <p className="font-serif text-sm font-black text-[#9b1c31] mt-0.5 tracking-wide">
                      {selectedApp.certificateValue || "EXTRAORDINARY BUREAUCRATIC RECOGNITION"}
                    </p>
                  </div>

                  <div className="border-t border-[#d8cfbd] pt-3">
                    <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                      Purpose / Justification:
                    </span>
                    <p className="mt-1 leading-5 text-[#172235] bg-[#f4efe4] p-3 rounded-lg border border-[#d8cfbd]">
                      {selectedApp.raw?.purpose || "Unspecified."}
                    </p>
                  </div>

                  {selectedApp.raw?.notes && (
                    <div className="border-t border-[#d8cfbd] pt-3">
                      <span className="font-bold text-[#687386] uppercase tracking-wider text-[10px]">
                        Additional Notes:
                      </span>
                      <p className="mt-1 leading-5 text-xs italic text-[#172235] bg-[#f4efe4] p-3 rounded-lg border border-[#d8cfbd]">
                        {selectedApp.raw?.notes}
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="border-t border-[#d8cfbd] pt-3 text-[11px] text-[#687386]">
                Filed on:{" "}
                {selectedApp.createdAt instanceof Date
                  ? selectedApp.createdAt.toLocaleString("en-GB")
                  : "Recently"}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t-2 border-[#172235] bg-[#eee8dc] px-4 py-3 sm:px-6 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
              {(selectedApp.type === "certificate" || selectedApp.status.toLowerCase() === "approved") ? (
                <button
                  type="button"
                  onClick={() => {
                    const app = selectedApp;
                    setSelectedApp(null);
                    handleOpenCertificate(app);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-[#172235] bg-[#172235] px-3.5 py-2 sm:py-1.5 text-xs font-black uppercase text-white shadow-[2px_2px_0_#e8c878] min-h-[38px] sm:min-h-[auto]"
                >
                  <Award size={13} className="text-[#e8c878]" />
                  <span>Generate Certificate</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="rounded-lg border-2 border-[#172235] bg-white px-4 py-2 sm:py-1.5 text-xs font-black uppercase text-[#172235] shadow-[2px_2px_0_#172235] min-h-[38px] sm:min-h-[auto]"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CERTIFICATE GENERATION & DOWNLOAD MODAL */}
      {activeCertApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border-2 border-[#172235] bg-[#fffaf0] shadow-[12px_12px_0_#172235] max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-[#172235] bg-[#172235] px-4 py-3 sm:px-6 sm:py-4 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <Award size={20} className="text-[#e8c878]" />
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e8c878]">
                    Official Republic Document
                  </span>
                  <h3 className="font-serif text-sm sm:text-base font-black">
                    Official Certificate of Recognition
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveCertApp(null);
                  if (certImageUrl) URL.revokeObjectURL(certImageUrl);
                  setCertImageUrl(null);
                }}
                className="rounded-lg border border-white/20 p-1.5 text-white transition hover:bg-white/10 shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Certificate Preview Body */}
            <div className="p-3 sm:p-6 text-center overflow-y-auto flex-1">
              {certLoading ? (
                <div className="py-12 sm:py-16">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#172235] bg-[#fffaf0] shadow-[3px_3px_0_#172235]">
                    <div className="h-7 w-7 animate-spin rounded-full border-3 border-[#9b1c31] border-t-transparent" />
                  </div>
                  <p className="mt-4 font-serif text-base sm:text-lg font-bold text-[#172235]">
                    Generating Certificate...
                  </p>
                  <p className="mt-1 text-xs text-[#687386]">
                    Applying official Ministry seals, raccoon insignia, and personalized bureaucratic citations.
                  </p>
                </div>
              ) : certError ? (
                <div className="py-10 sm:py-12">
                  <AlertCircle size={36} className="mx-auto text-[#9b1c31]" />
                  <p className="mt-3 text-sm font-bold text-[#9b1c31]">{certError}</p>
                  <button
                    type="button"
                    onClick={() => handleOpenCertificate(activeCertApp)}
                    className="mt-4 rounded-lg border-2 border-[#172235] bg-white px-4 py-2 text-xs font-black uppercase text-[#172235]"
                  >
                    Retry Generation
                  </button>
                </div>
              ) : certImageUrl ? (
                <div className="space-y-3 sm:space-y-4">
                  <div className="relative overflow-hidden rounded-xl border-2 border-[#172235] shadow-[4px_4px_0_#172235] bg-white">
                    <img
                      src={certImageUrl}
                      alt="Generated Certificate"
                      className="w-full h-auto object-contain max-h-[50vh] sm:max-h-[60vh] mx-auto"
                    />
                  </div>

                  <p className="text-[10px] sm:text-[11px] text-[#687386] italic">
                    Awarded by the Ministry of Useless Affairs · Case Reference: {activeCertApp.id}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Modal Actions */}
            <div className="border-t-2 border-[#172235] bg-[#eee8dc] px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
              <span className="text-[10px] sm:text-xs font-bold text-[#687386] text-center sm:text-left">
                Format: High Resolution PNG (1536 × 1024)
              </span>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                {certImageUrl && (
                  <button
                    type="button"
                    onClick={handleDownloadCertificate}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#172235] bg-[#9b1c31] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0_#172235] transition hover:bg-[#801426] min-h-[44px] sm:min-h-[auto]"
                  >
                    <Download size={15} />
                    <span>Download Certificate</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveCertApp(null);
                    if (certImageUrl) URL.revokeObjectURL(certImageUrl);
                    setCertImageUrl(null);
                  }}
                  className="rounded-lg border-2 border-[#172235] bg-white px-4 py-2 sm:py-2.5 text-xs font-black uppercase text-[#172235] shadow-[2px_2px_0_#172235] hover:bg-[#f4efe4] min-h-[40px] sm:min-h-[auto]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
