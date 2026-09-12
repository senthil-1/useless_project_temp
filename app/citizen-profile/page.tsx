"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import PageContainer from "@/components/PageContainer";
import LoadingState from "@/components/LoadingState";
import {
  User,
  ShieldCheck,
  Calendar,
  Award,
  ClipboardList,
  Edit3,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { getRank, calculateCitizenStats } from "@/lib/ranks";
export { getRank };

export default function CitizenProfilePage() {
  const { user, citizen, refreshCitizen } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(() => {
    if (typeof window !== "undefined" && user?.uid) {
      return calculateCitizenStats(user.uid, citizen);
    }
    return citizen || null;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // 1. Reconcile immediately with zero delay
    const initialStats = calculateCitizenStats(user.uid, citizen);
    const initialFull = {
      ...(citizen || {}),
      applicationCount: initialStats.applicationCount,
      uselessPoints: initialStats.uselessPoints,
      rank: initialStats.rank,
    };
    setProfileData(initialFull);

    if (!isEditing) {
      setEditFullName(initialFull.fullName || user.displayName || "");
      setEditDob(initialFull.dateOfBirth || "");
    }
    setLoading(false);

    // 2. Real-time listener for Firestore document
    const citizenRef = doc(db, "citizens", user.uid);
    const unsub = onSnapshot(
      citizenRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const fresh = (docSnap.data() || {}) as any;
          const stats = calculateCitizenStats(user.uid, fresh);
          const fullData: any = {
            ...fresh,
            applicationCount: stats.applicationCount,
            uselessPoints: stats.uselessPoints,
            rank: stats.rank,
          };
          setProfileData(fullData);
          if (fresh.rank !== stats.rank) {
            updateDoc(citizenRef, { rank: stats.rank }).catch(() => {});
          }
          if (!isEditing) {
            setEditFullName(fullData.fullName || "");
            setEditDob(fullData.dateOfBirth || "");
          }
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`mua_citizen_${user.uid}`, JSON.stringify(fullData));
            } catch {}
          }
        }
      },
      (err) => {
        console.warn("Could not read citizen document live from Firestore:", err);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (citizen && user?.uid) {
      const stats = calculateCitizenStats(user.uid, citizen);
      setProfileData((current: any) => ({
        ...(current || {}),
        ...citizen,
        applicationCount: stats.applicationCount,
        uselessPoints: stats.uselessPoints,
        rank: stats.rank,
      }));
    }
  }, [citizen, user?.uid]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!editFullName.trim()) {
      setError("Full Name cannot be blank.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const cleanName = editFullName.trim();
      const cleanDob = editDob || null;

      // Update Firebase Auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: cleanName });
      }

      // Update Firestore document citizens/{uid}
      try {
        await updateDoc(doc(db, "citizens", user.uid), {
          fullName: cleanName,
          dateOfBirth: cleanDob,
        });
      } catch (docErr) {
        console.warn("Could not update Firestore document:", docErr);
      }

      // Update local state and cache
      const updated = {
        ...profileData,
        fullName: cleanName,
        dateOfBirth: cleanDob,
      };
      setProfileData(updated);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`mua_citizen_${user.uid}`, JSON.stringify(updated));
        } catch {}
      }

      if (refreshCitizen) {
        refreshCitizen();
      }

      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Save profile error:", err);
      setError(err?.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  const points = profileData?.uselessPoints ?? 0;
  const computedRank = getRank(points);

  return (
    <PageContainer
      title="Citizen Profile"
      subtitle="Official Ministry Identity Dossier. All credentials here are recognized throughout the Republic of Questionable Decisions."
      showBackButton={true}
      maxWidth="max-w-4xl"
    >
      {loading ? (
        <LoadingState message="Extracting citizen dossier from the National Filing Cabinet..." />
      ) : (
        <div className="space-y-6">
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-xl border-2 border-[#2e7d32] bg-[#e8f5e9] p-4 text-xs font-bold text-[#2e7d32]">
              <CheckCircle2 size={16} />
              <span>Profile updated successfully in Ministry records.</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border-2 border-[#9b1c31] bg-[#fdf2f4] p-4 text-xs font-bold text-[#9b1c31]">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* MAIN IDENTITY CARD */}
          <div className="overflow-hidden rounded-2xl border-2 border-[#172235] bg-[#fffaf0] shadow-[8px_8px_0_#172235]">
            {/* Header banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b-2 border-[#172235] bg-[#172235] px-4 py-4 sm:px-8 sm:py-5 text-white">
              <div className="flex items-center gap-3 sm:gap-4">
                <img
                  src="/mua-logo.png"
                  alt="MUA Emblem"
                  className="h-11 w-11 sm:h-14 sm:w-14 shrink-0 object-contain rounded-full border border-[#e8c878] p-0.5 bg-white/5"
                />
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e8c878]">
                    Official Citizen Dossier
                  </span>
                  <h2 className="font-serif text-lg sm:text-2xl font-black">
                    Ministry Identity Card
                  </h2>
                </div>
              </div>

              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e8c878] bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-[#e8c878] transition hover:bg-white/20 min-h-[38px] w-full sm:w-auto"
                >
                  <Edit3 size={13} />
                  <span>Edit Details</span>
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 md:p-8">
              {isEditing ? (
                /* EDIT FORM */
                <form onSubmit={handleSave} className="space-y-4 sm:space-y-5">
                  <div className="rounded-lg border-2 border-[#172235] bg-[#fff8e1] p-3.5 text-xs font-bold text-[#172235]">
                    Note: Only non-sensitive information (Name & Date of Birth) can be altered. Citizen ID, Points, Rank, and Status are strictly system-governed.
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-wider text-[#172235]">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      required
                      disabled={saving}
                      className="w-full rounded-lg border-2 border-[#172235] bg-white px-4 py-2.5 text-sm font-medium outline-none transition focus:bg-[#fff8d9] focus:shadow-[3px_3px_0_#e8c878]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-wider text-[#172235]">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={editDob}
                      onChange={(e) => setEditDob(e.target.value)}
                      disabled={saving}
                      className="w-full rounded-lg border-2 border-[#172235] bg-white px-4 py-2.5 text-sm font-medium outline-none transition focus:bg-[#fff8d9] focus:shadow-[3px_3px_0_#e8c878]"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#172235] bg-[#9b1c31] px-5 py-3 sm:py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0_#172235] transition hover:bg-[#801426] disabled:opacity-60 min-h-[44px]"
                    >
                      <Save size={14} />
                      <span>{saving ? "Saving..." : "Save Changes"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#172235] bg-white px-4 py-3 sm:py-2.5 text-xs font-black uppercase tracking-wider text-[#172235] shadow-[2px_2px_0_#172235] transition hover:bg-[#eee8dc] min-h-[44px]"
                    >
                      <X size={14} />
                      <span>Cancel</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* READ-ONLY VIEW */
                <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
                  {/* Full Name */}
                  <div className="rounded-xl border border-[#d8cfbd] bg-white p-3.5 sm:p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#687386]">
                      Full Legal Designation
                    </span>
                    <p className="mt-1 font-serif text-lg sm:text-xl font-black text-[#172235] break-words">
                      {profileData?.fullName || "Distinguished Citizen"}
                    </p>
                  </div>

                  {/* Citizen ID */}
                  <div className="rounded-xl border-2 border-[#172235] bg-[#f4efe4] p-3.5 sm:p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#687386]">
                      Official Citizen ID
                    </span>
                    <p className="mt-1 font-mono text-base sm:text-xl font-black text-[#9b1c31] break-all">
                      {profileData?.citizenId || "Pending"}
                    </p>
                  </div>

                  {/* Email */}
                  <div className="rounded-xl border border-[#d8cfbd] bg-white p-3.5 sm:p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#687386]">
                      Email Address
                    </span>
                    <p className="mt-1 font-mono text-xs sm:text-sm font-bold text-[#172235] break-all">
                      {profileData?.email || user?.email}
                    </p>
                  </div>

                  {/* Date of Birth */}
                  <div className="rounded-xl border border-[#d8cfbd] bg-white p-3.5 sm:p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#687386]">
                      Date of Birth
                    </span>
                    <p className="mt-1 text-xs sm:text-sm font-bold text-[#172235]">
                      {profileData?.dateOfBirth
                        ? new Date(profileData.dateOfBirth).toLocaleDateString(
                            "en-GB",
                            { day: "numeric", month: "long", year: "numeric" }
                          )
                        : "Not specified in paperwork"}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="rounded-xl border border-[#d8cfbd] bg-white p-3.5 sm:p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#687386]">
                      Citizenship Status
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f5e9] px-3 py-1 text-xs font-black uppercase text-[#2e7d32]">
                        <ShieldCheck size={14} />
                        {profileData?.citizenshipStatus || "Active"}
                      </span>
                    </div>
                  </div>

                  {/* Joined Date */}
                  <div className="rounded-xl border border-[#d8cfbd] bg-white p-3.5 sm:p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#687386]">
                      Citizenship Inception Date
                    </span>
                    <p className="mt-1 text-xs sm:text-sm font-bold text-[#172235]">
                      {profileData?.joinedAt
                        ? new Date(profileData.joinedAt).toLocaleDateString(
                            "en-GB",
                            { day: "numeric", month: "long", year: "numeric" }
                          )
                        : "Long ago"}
                    </p>
                  </div>
                </div>
              )}

              {/* STATS BAR: Points, Rank, Applications */}
              <div className="mt-6 sm:mt-8 grid grid-cols-1 divide-y sm:divide-y-0 sm:divide-x divide-white/20 rounded-xl border-2 border-[#172235] bg-[#172235] p-4 sm:p-5 text-white sm:grid-cols-3">
                {/* Useless Points */}
                <div className="text-center pb-3 sm:pb-0 sm:pr-4">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e8c878]">
                    Useless Points
                  </span>
                  <p className="mt-1 font-mono text-2xl sm:text-3xl font-black text-white">
                    {points}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/50">
                    Officially earned
                  </p>
                </div>

                {/* Rank */}
                <div className="text-center py-3 sm:py-0 sm:px-4">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e8c878]">
                    Official Rank
                  </span>
                  <p className="mt-1 font-serif text-base sm:text-lg font-black text-[#e8c878]">
                    {computedRank}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/50">
                    System-evaluated
                  </p>
                </div>

                {/* Applications Count */}
                <div className="text-center pt-3 sm:pt-0 sm:pl-4">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e8c878]">
                    Applications Filed
                  </span>
                  <p className="mt-1 font-mono text-2xl sm:text-3xl font-black text-white">
                    {profileData?.applicationCount ?? 0}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/50">
                    Dossiers processed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
