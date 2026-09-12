"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import PageContainer from "@/components/PageContainer";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import {
  ALL_DEPARTMENTS_FILTER,
  StoredMinistryNotice,
} from "@/lib/notice-schema";
import {
  Radio,
  Clock,
  AlertTriangle,
  AlertCircle,
  Megaphone,
  Building2,
  Calendar,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

function parseDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val?.toDate === "function") return val.toDate();
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

export default function MinistryNoticesPage() {
  const { user } = useAuth();

  const [notices, setNotices] = useState<StoredMinistryNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All Departments");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadNotices = async (force: boolean = false) => {
    try {
      if (force) {
        setIsGenerating(true);
      } else if (notices.length === 0) {
        setLoading(true);
      }
      setError(null);

      // 1. Check local cache first for instant initial render (if not forcing and list empty)
      if (!force && notices.length === 0 && typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem("mua_cached_notices");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setNotices(parsed);
              setLoading(false);
            }
          }
        } catch {}
      }

      // 2. Fetch authoritative active notices from the server
      const url = force ? "/api/notices?force=true" : "/api/notices";
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.notices)) {
        setNotices(data.notices);

        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("mua_cached_notices", JSON.stringify(data.notices));
          } catch {}
        }
      } else {
        setError(data.error || "Unable to retrieve official notices at this time.");
      }
    } catch (err: any) {
      console.warn("MUA Notices Load Warning:", err);
      // Fallback to local cache if offline or network hiccup
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem("mua_cached_notices");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setNotices(parsed);
              setError(null);
              return;
            }
          }
        } catch {}
      }

      setError(
        "The Ministry's Notice Board is currently undergoing routine procedural maintenance."
      );
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, [user]);

  // Compute notice counts per department
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notices.forEach((n) => {
      counts[n.department] = (counts[n.department] || 0) + 1;
    });
    return counts;
  }, [notices]);

  // Filter notices based on selected department and search query
  const filteredNotices = useMemo(() => {
    return notices.filter((notice) => {
      // Department filter
      if (
        selectedDepartment !== "All Departments" &&
        notice.department !== selectedDepartment
      ) {
        return false;
      }

      // Search keyword filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = notice.title.toLowerCase().includes(q);
        const matchesDept = notice.department.toLowerCase().includes(q);
        const matchesMsg = notice.message.toLowerCase().includes(q);
        const matchesCat = notice.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDept && !matchesMsg && !matchesCat) {
          return false;
        }
      }

      return true;
    });
  }, [notices, selectedDepartment, searchQuery]);

  const getPriorityBadge = (priority: string = "Normal") => {
    const p = priority.toLowerCase();
    if (p.includes("urgent")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#9b1c31] bg-[#fdf2f4] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#9b1c31] shadow-[2px_2px_0_#9b1c31]">
          <AlertTriangle size={12} className="shrink-0" />
          <span>Immediate Unnecessary Action Required</span>
        </span>
      );
    }
    if (p.includes("important")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#b38600] bg-[#fff8e1] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#8a6800] shadow-[2px_2px_0_#b38600]">
          <AlertCircle size={12} className="shrink-0" />
          <span>Administrative Attention Required</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#172235] bg-[#e3f2fd] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#1565c0] shadow-[2px_2px_0_#172235]">
        <Radio size={11} className="shrink-0" />
        <span>Routine Ministry Notice</span>
      </span>
    );
  };

  return (
    <PageContainer
      title="Ministry Notices"
      subtitle="Official announcements from the various departments of the Ministry."
      showBackButton={true}
      maxWidth="max-w-5xl"
    >
      {/* ERROR BANNER */}
      {error && (
        <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border-2 border-[#9b1c31] bg-[#fdf2f4] p-4 text-xs font-bold text-[#9b1c31] shadow-[4px_4px_0_#9b1c31]">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadNotices(false)}
            className="inline-flex items-center gap-1 underline hover:text-[#7a1425] shrink-0"
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* FILTER & SEARCH PANEL */}
      <div className="mb-6 sm:mb-8 overflow-hidden rounded-2xl border-2 border-[#172235] bg-[#fffaf0] p-4 sm:p-6 shadow-[6px_6px_0_#172235]">
        <div className="flex flex-col gap-4 sm:gap-5">
          {/* Status Indicator Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d8cfbd]/60 pb-3 text-[10px] font-bold text-[#687386]">
            <span className="flex items-center gap-1.5 font-mono">
              <span className="inline-block h-2 w-2 rounded-full bg-[#2e7d32] animate-pulse"></span>
              <span>Official Gazette Registry • Real-Time Ministerial Dispatch</span>
            </span>
            <span className="font-mono text-[10px] text-[#687386]">
              Active Circulars: {notices.length}
            </span>
          </div>

          {/* Search Box & Refresh Action */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notices by keyword, title, or department..."
                className="w-full rounded-xl border-2 border-[#172235] bg-white px-4 py-2.5 text-xs font-bold text-[#172235] placeholder:text-[#687386] focus:border-[#9b1c31] focus:outline-none shadow-[2px_2px_0_#172235]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-[#687386] hover:text-[#172235]"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => loadNotices(true)}
              disabled={isGenerating}
              title="Request the Central Bureau to issue updated circulars"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#172235] bg-[#e8c878] hover:bg-[#dfba60] active:translate-y-0.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#172235] shadow-[3px_3px_0_#172235] transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
            >
              <RefreshCw size={13} className={isGenerating ? "animate-spin text-[#9b1c31]" : ""} />
              <span>{isGenerating ? "Issuing Decrees..." : "Refresh Gazette"}</span>
            </button>
          </div>

          {/* Department Filter: Mobile Select Dropdown (320px - 768px) */}
          <div className="block lg:hidden">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#687386] mb-1.5">
              Filter by Department:
            </label>
            <div className="relative">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full rounded-xl border-2 border-[#172235] bg-white px-4 py-3 text-xs font-bold text-[#172235] shadow-[3px_3px_0_#172235] focus:outline-none focus:border-[#9b1c31] appearance-none cursor-pointer"
              >
                {ALL_DEPARTMENTS_FILTER.map((dept) => {
                  const count =
                    dept === "All Departments"
                      ? notices.length
                      : departmentCounts[dept] || 0;
                  return (
                    <option key={dept} value={dept}>
                      {dept} ({count})
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs text-[#172235]">
                ▼
              </div>
            </div>
          </div>

          {/* Department Filter: Desktop Wrapping Pills (1024px+) */}
          <div className="hidden lg:block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#687386]">
              Filter by Department:
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {ALL_DEPARTMENTS_FILTER.map((dept) => {
                const count =
                  dept === "All Departments"
                    ? notices.length
                    : departmentCounts[dept] || 0;
                const isSelected = selectedDepartment === dept;

                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDepartment(dept)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                      isSelected
                        ? "border-2 border-[#172235] bg-[#172235] text-[#e8c878] shadow-[3px_3px_0_#9b1c31]"
                        : "border-2 border-[#172235] bg-white text-[#172235] hover:bg-[#f4efe4] shadow-[2px_2px_0_#172235]"
                    }`}
                  >
                    <span>{dept}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[9px] font-mono ${
                        isSelected
                          ? "bg-[#e8c878] text-[#172235]"
                          : "bg-[#f4efe4] text-[#687386]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* BACKGROUND DISPATCHING BANNER */}
      {isGenerating && notices.length > 0 && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border-2 border-[#172235] bg-[#fff8e1] px-4 py-3 text-xs font-bold text-[#172235] shadow-[4px_4px_0_#172235] animate-pulse">
          <div className="flex items-center gap-2.5">
            <RefreshCw size={15} className="animate-spin text-[#9b1c31] shrink-0" />
            <span>The Central Bureau is currently formulating and stamping new ministerial decrees across all departments...</span>
          </div>
          <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#9b1c31] shrink-0">
            Dispatching
          </span>
        </div>
      )}

      {/* NOTICES LIST FEED */}
      {loading && notices.length === 0 ? (
        <LoadingState
          message="Retrieving official Ministry notices from Central Registry..."
        />
      ) : filteredNotices.length === 0 ? (
        <EmptyState
          title="No Ministry notices are currently available."
          description="The departments have apparently found nothing unnecessary to announce."
        />
      ) : (
        <div className="space-y-6">
          {filteredNotices.map((notice) => {
            const pubDate = parseDate(notice.publishedAt);

            return (
              <article
                key={notice.id}
                className="overflow-hidden rounded-2xl border-2 border-[#172235] bg-[#fffaf0] shadow-[6px_6px_0_#172235] transition-all hover:shadow-[8px_8px_0_#172235]"
              >
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b-2 border-[#172235] bg-[#172235] px-4 py-3 sm:px-6 sm:py-3.5 text-white">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 size={16} className="text-[#e8c878] shrink-0" />
                    <span className="text-xs sm:text-sm font-serif font-black uppercase tracking-wider text-[#e8c878] truncate">
                      {notice.department}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {getPriorityBadge(notice.priority)}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-7 space-y-4">
                  {/* Category Pill + Document Reference */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-[#687386]">
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#d8cfbd] bg-[#f4efe4] px-2.5 py-1 uppercase tracking-widest text-[#9b1c31] font-black">
                      <Megaphone size={11} />
                      <span>{notice.category}</span>
                    </span>

                    <span className="font-mono text-[11px] font-bold text-[#687386]">
                      REF: {notice.id}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif text-xl sm:text-2xl font-black text-[#172235] leading-snug break-words">
                    {notice.title}
                  </h3>

                  {/* Official Notice Text */}
                  <div className="rounded-xl border-2 border-[#d8cfbd] bg-[#f4efe4]/70 p-4 sm:p-5 text-xs sm:text-sm leading-6 text-[#172235] whitespace-pre-line shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] break-words">
                    {notice.message}
                  </div>

                  {/* Metadata Row: Published Date */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] font-bold text-[#687386] border-t border-[#d8cfbd]/60">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Calendar size={13} className="text-[#9b1c31]" />
                      <span>
                        Published:{" "}
                        {pubDate.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 font-mono text-[10px] text-[#687386]">
                      <Clock size={12} className="text-[#b38600]" />
                      <span>Official Dispatch</span>
                    </div>
                  </div>
                </div>

                {/* Footer Official Gazetted Seal */}
                <div className="border-t-2 border-[#172235] bg-[#eee8dc] px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-1 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-[#687386]">
                  <span className="flex items-center gap-1">
                    <span>Republic of Questionable Decisions</span>
                    <span className="text-[#9b1c31]">•</span>
                    <span>Ministry Notice Board</span>
                  </span>
                  <span className="flex items-center gap-1 text-[#2e7d32]">
                    <CheckCircle2 size={11} />
                    <span>Gazetted by Ministry Protocol</span>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
