"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserRound, Award, FileWarning, Medal, Edit3, Save, X } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import AuthGuard from "@/components/AuthGuard";
import { getRank } from "@/lib/ranks";

function ProfilePage() {
  const { user, citizen, refreshCitizen } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(citizen?.fullName || "");
  const [editDob, setEditDob] = useState(citizen?.dateOfBirth || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const initials = (citizen?.fullName || user?.displayName || "C")
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const handleSave = async () => {
    if (!user || !editName.trim()) return;
    try {
      setSaving(true);
      setError("");
      await updateDoc(doc(db, "citizens", user.uid), {
        fullName: editName.trim(),
        dateOfBirth: editDob || null,
      });
      await refreshCitizen();
      setEditing(false);
    } catch (e: any) {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">

      <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#6f1020] mb-8 transition-colors">
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      <div className="grid lg:grid-cols-[.38fr_.62fr] gap-8">

        {/* Citizen card */}
        <section className="card rounded-2xl p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="w-20 h-20 rounded-full bg-[#10243d] text-[#c9a44b] grid place-items-center text-2xl font-black">
              {initials}
            </div>
            {!editing ? (
              <button onClick={() => { setEditing(true); setEditName(citizen?.fullName || ""); setEditDob(citizen?.dateOfBirth || ""); }} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#6f1020] transition-colors border border-[#ded6c9] rounded-lg px-3 py-1.5">
                <Edit3 size={13} /> Edit
              </button>
            ) : (
              <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#6f1020] transition-colors border border-[#ded6c9] rounded-lg px-3 py-1.5">
                <X size={13} /> Cancel
              </button>
            )}
          </div>

          <div className="badge bg-[#efe6ce] text-[#6f1020] mb-3">Citizen Profile</div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Full Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input text-sm" placeholder="Full name" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Date of Birth</label>
                <input type="date" value={editDob} onChange={(e) => setEditDob(e.target.value)} className="input text-sm" />
              </div>
              {error && <p className="text-xs text-[#6f1020] font-semibold">{error}</p>}
              <button onClick={handleSave} disabled={saving} className="btn btn-primary w-full py-2.5 text-sm">
                <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ) : (
            <>
              <h1 className="serif text-3xl mt-1">{citizen?.fullName || user?.displayName || "—"}</h1>
              <div className="text-sm text-slate-500 mt-1">{user?.email}</div>
              {citizen?.dateOfBirth && (
                <div className="text-sm text-slate-500 mt-1">
                  DOB: {new Date(citizen.dateOfBirth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              )}
            </>
          )}

          {/* Citizen ID card */}
          <div className="mt-6 p-4 rounded-xl bg-[#10243d] text-white">
            <div className="text-[9px] uppercase tracking-[.2em] text-[#c9a44b] font-bold">Citizen ID</div>
            <div className="font-black text-lg mt-1 tracking-wider">{citizen?.citizenId || "Pending"}</div>
            <div className="text-[10px] text-slate-400 mt-1">Ministry of Useless Affairs</div>
          </div>

          {/* Rank */}
          <div className="mt-4 p-4 rounded-xl bg-[#f1eee7] border border-[#ded6c9]">
            <div className="text-[10px] uppercase tracking-[.16em] text-slate-500 font-bold">Current Rank</div>
            <div className="serif text-xl mt-1">{getRank(citizen?.uselessPoints ?? 0)}</div>
            <div className="text-sm mt-1 font-bold text-[#6f1020]">{citizen?.uselessPoints || 0} Useless Points</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-[#f7f3ea] border border-[#ded6c9]">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Status</div>
              <div className="font-bold mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {citizen?.citizenshipStatus || "Active"}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#f7f3ea] border border-[#ded6c9]">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Joined</div>
              <div className="font-bold mt-1">
                {citizen?.joinedAt ? new Date(citizen.joinedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}
              </div>
            </div>
          </div>

          <Link href="/leaderboard" className="btn btn-secondary w-full mt-5 text-sm">View Rankings</Link>
        </section>

        {/* Right: stats + activity */}
        <section className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { value: citizen?.applicationCount || 0, label: "Applications", Icon: FileWarning },
              { value: citizen?.uselessPoints || 0, label: "Useless Points", Icon: Award },
              { value: 0, label: "Certificates", Icon: Medal },
            ].map(({ value, label, Icon }) => (
              <div className="card rounded-2xl p-6" key={label}>
                <Icon size={18} className="text-[#6f1020]" />
                <div className="serif text-3xl mt-5">{value}</div>
                <div className="text-xs uppercase tracking-[.1em] text-slate-500 mt-2">{label}</div>
              </div>
            ))}
          </div>

          {/* Official record */}
          <div className="card rounded-2xl p-8">
            <div className="flex items-center gap-2 font-bold mb-5">
              <UserRound size={18} /> Official Citizen Record
            </div>
            <div className="space-y-3">
              {[
                ["Full Name", citizen?.fullName || "—"],
                ["Email Address", user?.email || "—"],
                ["Citizen ID", citizen?.citizenId || "Pending"],
                ["Date of Birth", citizen?.dateOfBirth ? new Date(citizen.dateOfBirth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Not provided"],
                ["Citizenship Status", citizen?.citizenshipStatus || "Active"],
                ["Member Since", citizen?.joinedAt ? new Date(citizen.joinedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"],
                ["Useless Points", `${citizen?.uselessPoints || 0} pts`],
                ["Current Rank", getRank(citizen?.uselessPoints ?? 0)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-start py-2.5 border-b border-[#ede8df] last:border-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 w-40 shrink-0">{label}</span>
                  <span className="text-sm font-semibold text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="card rounded-2xl p-6">
            <h3 className="font-black text-sm uppercase tracking-wider mb-4">Ministry Services</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Link href="/report-incident" className="btn btn-wine py-2.5 text-sm">Report Incident</Link>
              <Link href="/certificate" className="btn btn-primary py-2.5 text-sm">Request Certificate</Link>
              <Link href="/track" className="btn btn-secondary py-2.5 text-sm">Track Application</Link>
              <Link href="/notifications" className="btn btn-secondary py-2.5 text-sm">Notifications</Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default function Profile() {
  return <AuthGuard><ProfilePage /></AuthGuard>;
}
