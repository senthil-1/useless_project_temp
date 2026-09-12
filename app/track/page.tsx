"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { ArrowLeft, SearchCheck, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Application {
  id: string;
  caseId: string;
  serviceName: string;
  title: string;
  status: string;
  department: string;
  createdAt: any;
  type: string;
}

const statusIcon: Record<string, React.ReactNode> = {
  Submitted: <Clock size={15} className="text-amber-500" />,
  "Under Review": <Loader2 size={15} className="text-blue-500" />,
  Approved: <CheckCircle2 size={15} className="text-green-600" />,
  Rejected: <XCircle size={15} className="text-red-500" />,
  Completed: <CheckCircle2 size={15} className="text-green-600" />,
};

function TrackPage() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "applications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    getDocs(q)
      .then((snap) => {
        setApps(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Application)));
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Track: Could not fetch applications:", err);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#6f1020] mb-8 transition-colors">
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      <div className="mb-8">
        <div className="badge bg-[#efe6ce] text-[#6f1020] mb-3">Application Tracking</div>
        <h1 className="serif text-5xl md:text-6xl leading-tight">Where is your paperwork?</h1>
        <p className="text-lg text-slate-600 mt-4 leading-8">Track all your submissions to the Ministry. Updated in real time, with maximum bureaucratic transparency.</p>
      </div>

      <div className="card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500">
            <Loader2 size={24} className="animate-spin mx-auto mb-3" />
            Consulting the archives...
          </div>
        ) : apps.length === 0 ? (
          <div className="p-10 text-center">
            <SearchCheck size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-600">No applications yet.</p>
            <p className="text-sm text-slate-400 mt-1">Submit an incident report or request a certificate to get started.</p>
            <Link href="/report-incident" className="btn btn-primary mt-5 inline-flex py-2.5 px-5 text-sm">Report an Incident</Link>
          </div>
        ) : (
          apps.map((app) => (
            <div key={app.id} className="p-5 md:p-6 border-b border-[#ded6c9] last:border-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#6f1020] bg-[#f3e1e3] px-2 py-0.5 rounded">{app.caseId}</span>
                    <span className="text-xs text-slate-400">{app.serviceName}</span>
                  </div>
                  <div className="font-bold mt-1.5 truncate">{app.title}</div>
                  <div className="text-sm text-slate-500 mt-0.5">{app.department}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-sm font-semibold">
                  {statusIcon[app.status] ?? <Clock size={15} />}
                  {app.status}
                </div>
              </div>
              {app.createdAt && (
                <div className="text-xs text-slate-400 mt-2">
                  Submitted {new Date(app.createdAt.seconds * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Track() {
  return <AuthGuard><TrackPage /></AuthGuard>;
}
