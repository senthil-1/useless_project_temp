"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import AuthGuard from "@/components/AuthGuard";
import { Crown, Trophy, Loader2 } from "lucide-react";
import { getRank } from "@/lib/ranks";

interface LeaderEntry {
  uid: string;
  fullName: string;
  rank: string;
  uselessPoints: number;
  citizenId: string;
}

function LeaderboardPage() {
  const { citizen } = useAuth();
  const [rows, setRows] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "citizens"), orderBy("uselessPoints", "desc"), limit(20));
    getDocs(q)
      .then((snap) => {
        setRows(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as LeaderEntry)));
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Leaderboard: Could not fetch rankings:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-5 py-14">
      <div className="text-center mb-10">
        <div className="badge bg-[#efe6ce] text-[#6f1020] inline-flex items-center gap-2 mb-4">
          <Crown size={13} /> Citizen Rankings
        </div>
        <h1 className="serif text-6xl">The hierarchy of uselessness.</h1>
        <p className="max-w-2xl mx-auto text-slate-600 mt-4 leading-7">
          Points are awarded for bureaucratic interaction, questionable achievements, and exceptional commitment to doing things that did not need doing.
        </p>
      </div>

      <div className="card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500">
            <Loader2 size={24} className="animate-spin mx-auto mb-3" />
            Tallying uselessness...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No citizens ranked yet.</div>
        ) : (
          rows.map((row, i) => {
            const isMe = citizen?.uid === row.uid;
            return (
              <div key={row.uid} className={`p-5 md:p-6 border-b border-[#ded6c9] last:border-0 flex items-center gap-5 ${isMe ? "bg-[#efe6ce]" : ""}`}>
                <div className={`w-10 h-10 rounded-full grid place-items-center font-black shrink-0 ${i < 3 ? "bg-[#c9a44b] text-white" : "bg-[#f1eee7] text-slate-600"}`}>
                  {i < 3 ? <Trophy size={17} /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold flex items-center gap-2">
                    {row.fullName}
                    {isMe && <span className="text-[10px] font-bold bg-[#6f1020] text-white px-2 py-0.5 rounded-full">You</span>}
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">{getRank(row.uselessPoints ?? 0)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-lg">{row.uselessPoints ?? 0}</div>
                  <div className="text-[10px] uppercase tracking-[.14em] text-slate-400">useless points</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function Leaderboard() {
  return <AuthGuard><LeaderboardPage /></AuthGuard>;
}
