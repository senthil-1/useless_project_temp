"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { ArrowLeft, BellOff, Loader2, CheckCheck } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  createdAt: any;
}

function NotificationsPage() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    getDocs(q)
      .then((snap) => {
        setNotifs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification)));
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Notifications: Could not fetch:", err);
        setLoading(false);
      });
  }, [user]);

  const markRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    if (!user) return;
    const unread = notifs.filter((n) => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach((n) => batch.update(doc(db, "notifications", n.id), { read: true }));
    await batch.commit();
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#6f1020] mb-8 transition-colors">
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="badge bg-[#efe6ce] text-[#6f1020] mb-3">Notifications</div>
          <h1 className="serif text-5xl md:text-6xl leading-tight">Official dispatches.</h1>
          <p className="text-slate-600 mt-3">Updates from the Ministry on your applications and activities.</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn btn-secondary py-2 px-4 text-xs flex items-center gap-1.5 shrink-0 mt-2">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500">
            <Loader2 size={24} className="animate-spin mx-auto mb-3" />
            Retrieving dispatches...
          </div>
        ) : notifs.length === 0 ? (
          <div className="p-10 text-center">
            <BellOff size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-600">No notifications yet.</p>
            <p className="text-sm text-slate-400 mt-1">The Ministry will contact you when something happens.</p>
          </div>
        ) : (
          notifs.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`p-5 md:p-6 border-b border-[#ded6c9] last:border-0 cursor-pointer transition-colors ${!n.read ? "bg-[#fffdf7] hover:bg-[#f7f3ea]" : "hover:bg-[#f7f3ea]"}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.read ? "bg-[#6f1020]" : "bg-transparent"}`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-sm ${!n.read ? "text-[#10243d]" : "text-slate-600"}`}>{n.title}</div>
                  <p className="text-sm text-slate-500 mt-1 leading-6">{n.message}</p>
                  {n.createdAt && (
                    <div className="text-xs text-slate-400 mt-2">
                      {new Date(n.createdAt.seconds * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </div>
                {!n.read && (
                  <span className="text-[10px] font-bold bg-[#6f1020] text-white px-2 py-0.5 rounded-full shrink-0">New</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Notifications() {
  return <AuthGuard><NotificationsPage /></AuthGuard>;
}
