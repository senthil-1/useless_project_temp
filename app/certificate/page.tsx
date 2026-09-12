"use client";

import { useState } from "react";
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { ArrowLeft, Award, CheckCircle2 } from "lucide-react";

const certs = [
  { id: "late", label: "🏆 Always Late Award", desc: "Consistently arriving late despite having sufficient time." },
  { id: "biscuit", label: "🍪 Biscuit Champion", desc: "Unmatched dedication to biscuit consumption during work hours." },
  { id: "sleep", label: "😴 Sleep Expert", desc: "Demonstrated mastery of sleeping in inappropriate situations." },
  { id: "phone", label: "📱 Phone Usage Champion", desc: "Exceptional phone usage during meetings and important events." },
  { id: "gaming", label: "🎮 Gaming Champion", desc: "Outstanding commitment to gaming during productive hours." },
  { id: "couch", label: "🛋️ Couch Champion", desc: "Supreme dedication to couch-based activities." },
];

function CertificatePage() {
  const { user, citizen, refreshCitizen } = useAuth();
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [certNo, setCertNo] = useState("");
  const [error, setError] = useState("");

  const selectedCert = certs.find((c) => c.id === selected);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !citizen || !selected) { setError("Please select an achievement."); return; }
    try {
      setLoading(true);
      setError("");
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      const no = `MUA-CERT-${year}-${rand}`;

      await addDoc(collection(db, "applications"), {
        userId: user.uid,
        citizenId: citizen.citizenId,
        type: "certificate",
        serviceId: "certificate",
        serviceName: "Certificate Request",
        title: selectedCert!.label,
        description: selectedCert!.desc,
        caseId: no,
        status: "Approved",
        department: "Department of Prestigious Achievements",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        userId: user.uid,
        title: "Certificate Issued",
        message: `Your certificate "${selectedCert!.label}" has been officially issued. Certificate No: ${no}.`,
        read: false,
        type: "certificate",
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "citizens", user.uid), {
        uselessPoints: increment(20),
        applicationCount: increment(1),
      });

      await refreshCitizen();
      setCertNo(no);
      setDone(true);
    } catch {
      setError("Failed to issue certificate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done && selectedCert) {
    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
    return (
      <div className="max-w-4xl mx-auto px-5 py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#6f1020] mb-8 transition-colors">
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>
        <div className="card rounded-2xl p-8 md:p-10">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={20} className="text-green-600" />
            <span className="text-sm font-bold text-green-700">Certificate Issued — +20 Useless Points</span>
          </div>
          <div className="aspect-[16/9] border-8 border-double border-[#c9a44b] bg-[#fbf8f0] p-8 flex flex-col items-center justify-center text-center mt-4 rounded-xl">
            <div className="text-[10px] tracking-[.2em] text-slate-500">MINISTRY OF USELESS AFFAIRS</div>
            <div className="serif text-3xl md:text-4xl mt-4">{selectedCert.label.replace(/^\S+\s/, "").toUpperCase()}</div>
            <p className="text-sm text-slate-600 mt-3 max-w-md">{selectedCert.desc}</p>
            <div className="mt-4 text-xs font-bold text-slate-500">Awarded to: {citizen?.fullName}</div>
            <div className="mt-2 text-xs font-bold text-slate-400">{certNo} • {today}</div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => { setDone(false); setSelected(""); }} className="btn btn-primary py-2.5 px-5 text-sm">Request another</button>
            <Link href="/track" className="btn btn-secondary py-2.5 px-5 text-sm">View all applications</Link>
            <Link href="/" className="btn btn-secondary py-2.5 px-5 text-sm">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#6f1020] mb-8 transition-colors">
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      <div className="mb-8">
        <div className="badge bg-[#efe6ce] text-[#6f1020] mb-3">Certificate Services</div>
        <h1 className="serif text-5xl md:text-6xl leading-tight">Request a prestigious<br />certificate.</h1>
        <p className="text-lg text-slate-600 mt-4 leading-8">Select an achievement of questionable importance and have it formally recognized by the Ministry. Earn +20 Useless Points.</p>
      </div>

      <div className="card rounded-2xl p-7 md:p-9">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="text-sm font-bold mb-3">Select Achievement *</div>
            <div className="grid md:grid-cols-2 gap-3">
              {certs.map((c) => (
                <label key={c.id} className={`border rounded-xl p-4 flex gap-3 items-start cursor-pointer transition-colors ${selected === c.id ? "border-[#6f1020] bg-[#f3e1e3]" : "border-[#ded6c9] bg-white hover:bg-[#f7f3ea]"}`}>
                  <input type="radio" name="cert" value={c.id} checked={selected === c.id} onChange={() => setSelected(c.id)} className="sr-only" />
                  <div>
                    <div className="font-semibold text-sm">{c.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{c.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-[#6f1020] font-semibold bg-[#f3e1e3] rounded-xl px-4 py-3">{error}</p>}

          <button type="submit" disabled={loading || !selected} className="btn btn-wine w-full py-3.5 text-sm disabled:opacity-50">
            {loading ? "Issuing certificate..." : "Request Official Certificate"}
          </button>
        </form>
        <div className="mt-4 flex gap-2 items-center text-xs text-slate-500">
          <Award size={14} /> Certificates are issued instantly and carry the full weight of the Ministry's authority.
        </div>
      </div>
    </div>
  );
}

export default function Certificate() {
  return <AuthGuard><CertificatePage /></AuthGuard>;
}
