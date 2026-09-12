"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getRank, calculateCitizenStats } from "@/lib/ranks";

export interface CitizenData {
  uid: string;
  fullName: string;
  email: string;
  dateOfBirth?: string;
  citizenId: string;
  citizenshipStatus: string;
  joinedAt: string;
  uselessPoints: number;
  rank: string;
  applicationCount: number;
}

interface AuthContextType {
  user: User | null;
  citizen: CitizenData | null;
  loading: boolean;
  refreshCitizen: () => Promise<void>;
  recordApplicationSubmission: (appCountDelta?: number, pointsDelta?: number) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  citizen: null,
  loading: true,
  refreshCitizen: async () => {},
  recordApplicationSubmission: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [citizen, setCitizen] = useState<CitizenData | null>(null);
  const [loading, setLoading] = useState(true);

  const buildFallbackCitizen = (firebaseUser: User): CitizenData => {
    let hash = 0;
    for (let i = 0; i < firebaseUser.uid.length; i++) {
      hash = (hash * 31 + firebaseUser.uid.charCodeAt(i)) % 900000;
    }
    const citizenNum = 100000 + Math.abs(hash);

    return {
      uid: firebaseUser.uid,
      fullName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Distinguished Citizen",
      email: firebaseUser.email || "",
      citizenId: `MUA-${new Date().getFullYear()}-${citizenNum}`,
      citizenshipStatus: "Active",
      joinedAt: new Date().toISOString(),
      uselessPoints: 0,
      rank: getRank(0),
      applicationCount: 0,
    };
  };

  const recordApplicationSubmission = (appCountDelta: number = 1, pointsDelta: number = 10) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setCitizen((prev) => {
      const base = prev || buildFallbackCitizen(currentUser);
      const nextPts = (base.uselessPoints || 0) + pointsDelta;
      const nextApps = (base.applicationCount || 0) + appCountDelta;
      const nextRank = getRank(nextPts);

      const updated: CitizenData = {
        ...base,
        applicationCount: nextApps,
        uselessPoints: nextPts,
        rank: nextRank,
      };

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`mua_citizen_${currentUser.uid}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  const refreshCitizen = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const snap = await getDoc(doc(db, "citizens", currentUser.uid));
      if (snap.exists()) {
        const data = snap.data() as CitizenData;
        const stats = calculateCitizenStats(currentUser.uid, data);
        const merged: CitizenData = {
          ...data,
          applicationCount: stats.applicationCount,
          uselessPoints: stats.uselessPoints,
          rank: stats.rank,
        };
        setCitizen(merged);
        if (data.rank !== stats.rank) {
          updateDoc(doc(db, "citizens", currentUser.uid), {
            rank: stats.rank,
          }).catch(() => {});
        }
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`mua_citizen_${currentUser.uid}`, JSON.stringify(merged));
          } catch {}
        }
        return;
      }
    } catch (e) {
      console.warn("Could not refresh citizen document from Firestore:", e);
    }

    // Fallback reconciliation if Firestore query was blocked or returned empty
    if (typeof window !== "undefined") {
      try {
        let base = buildFallbackCitizen(currentUser);
        const cached = localStorage.getItem(`mua_citizen_${currentUser.uid}`);
        if (cached) {
          base = { ...base, ...JSON.parse(cached) };
        }
        const stats = calculateCitizenStats(currentUser.uid, base);
        const reconciled: CitizenData = {
          ...base,
          applicationCount: stats.applicationCount,
          uselessPoints: stats.uselessPoints,
          rank: stats.rank,
        };
        setCitizen(reconciled);
        localStorage.setItem(`mua_citizen_${currentUser.uid}`, JSON.stringify(reconciled));
      } catch {}
    }
  };

  useEffect(() => {
    let citizenUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (citizenUnsub) {
        citizenUnsub();
        citizenUnsub = null;
      }

      if (firebaseUser) {
        // Fallback or cached representation reconciled with any local submissions
        let initialCitizen = buildFallbackCitizen(firebaseUser);
        if (typeof window !== "undefined") {
          try {
            const cached = localStorage.getItem(`mua_citizen_${firebaseUser.uid}`);
            if (cached) {
              initialCitizen = { ...initialCitizen, ...JSON.parse(cached) };
            }
          } catch {}
        }
        const stats = calculateCitizenStats(firebaseUser.uid, initialCitizen);
        initialCitizen = {
          ...initialCitizen,
          applicationCount: stats.applicationCount,
          uselessPoints: stats.uselessPoints,
          rank: stats.rank,
        };
        setCitizen(initialCitizen);

        // Real-time listener for Firestore citizen document
        const citizenRef = doc(db, "citizens", firebaseUser.uid);
        citizenUnsub = onSnapshot(
          citizenRef,
          async (snap) => {
            if (snap.exists()) {
              const data = snap.data() as CitizenData;
              const liveStats = calculateCitizenStats(firebaseUser.uid, data);
              const merged: CitizenData = {
                ...buildFallbackCitizen(firebaseUser),
                ...data,
                applicationCount: liveStats.applicationCount,
                uselessPoints: liveStats.uselessPoints,
                rank: liveStats.rank,
              };
              setCitizen(merged);
              if (data.rank !== liveStats.rank) {
                updateDoc(citizenRef, {
                  rank: liveStats.rank,
                }).catch(() => {});
              }
              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem(`mua_citizen_${firebaseUser.uid}`, JSON.stringify(merged));
                } catch {}
              }
            } else {
              // Initialize document in Firestore if it doesn't exist yet
              const initStats = calculateCitizenStats(firebaseUser.uid, null);
              const newCitizen: CitizenData = {
                ...buildFallbackCitizen(firebaseUser),
                applicationCount: initStats.applicationCount,
                uselessPoints: initStats.uselessPoints,
                rank: initStats.rank,
              };
              try {
                await setDoc(citizenRef, {
                  ...newCitizen,
                  createdAt: serverTimestamp(),
                });
              } catch (initErr) {
                console.warn("Could not initialize citizen in Firestore:", initErr);
              }
              setCitizen(newCitizen);
              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem(`mua_citizen_${firebaseUser.uid}`, JSON.stringify(newCitizen));
                } catch {}
              }
            }
            setLoading(false);
          },
          (err) => {
            console.warn("Citizen snapshot listener error:", err);
            if (typeof window !== "undefined") {
              try {
                let active = buildFallbackCitizen(firebaseUser);
                const cached = localStorage.getItem(`mua_citizen_${firebaseUser.uid}`);
                if (cached) {
                  active = { ...active, ...JSON.parse(cached) };
                }
                const errStats = calculateCitizenStats(firebaseUser.uid, active);
                const reconciled: CitizenData = {
                  ...active,
                  applicationCount: errStats.applicationCount,
                  uselessPoints: errStats.uselessPoints,
                  rank: errStats.rank,
                };
                setCitizen(reconciled);
                localStorage.setItem(`mua_citizen_${firebaseUser.uid}`, JSON.stringify(reconciled));
              } catch {}
            }
            setLoading(false);
          }
        );
      } else {
        setCitizen(null);
        setLoading(false);
      }
    });

    return () => {
      if (citizenUnsub) citizenUnsub();
      authUnsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, citizen, loading, refreshCitizen, recordApplicationSubmission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
