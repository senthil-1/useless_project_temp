"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

/* ============================================================
   CITIZEN ID
   ============================================================ */

function generateCitizenId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);

  return `MUA-${year}-${rand}`;
}

/* ============================================================
   CITIZEN RANK
   ============================================================ */

import { getRank } from "@/lib/ranks";

/* ============================================================
   REGISTER PAGE
   ============================================================ */

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dob, setDob] = useState("");
  const [reason, setReason] = useState("");
  const [experiencedBureaucracy, setExperiencedBureaucracy] =
    useState("");
  const [agree, setAgree] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  /* Clear any lingering session when landing on register page */
  useEffect(() => {
    if (auth.currentUser) {
      signOut(auth).catch(() => {});
    }
  }, []);

  /* ============================================================
     SUBMIT APPLICATION
     ============================================================ */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) return;

    /* ----------------------------------------------------------
       VALIDATION
       ---------------------------------------------------------- */

    if (
      !fullName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      alert(
        "APPLICATION REJECTED\n\n" +
        "Please complete all required fields.\n\n" +
        "The Ministry cannot process an incomplete application."
      );

      return;
    }

    if (password !== confirmPassword) {
      alert(
        "PASSWORD MISMATCH\n\n" +
        "The two passwords do not agree.\n\n" +
        "Please resolve this highly serious administrative dispute."
      );

      return;
    }

    if (password.length < 6) {
      alert(
        "PASSWORD TOO WEAK\n\n" +
        "Your password must contain at least 6 characters."
      );

      return;
    }

    if (!agree) {
      alert(
        "DECLARATION REQUIRED\n\n" +
        "Please confirm that you have read and accepted " +
        "the Ministry's completely reasonable terms and conditions."
      );

      return;
    }

    try {
      setLoading(true);

      const cleanName = fullName.trim();
      const cleanEmail = email.trim().toLowerCase();

      /* ========================================================
         1. CREATE FIREBASE AUTH ACCOUNT
         ======================================================== */

      console.log("MUA 1/4 — Creating citizen account...");

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      const user = credential.user;
      const uid = user.uid;

      console.log("MUA 2/4 — Citizen account created:", uid);

      /* ========================================================
         2. UPDATE PROFILE
         ======================================================== */

      await updateProfile(user, {
        displayName: cleanName,
      });

      console.log("MUA 3/4 — Citizen profile updated.");

      /* ========================================================
         3. GENERATE CITIZEN ID & PREPARE DATA
         ======================================================== */

      const citizenId = generateCitizenId();

      const citizenData = {
        uid,
        fullName: cleanName,
        email: cleanEmail,
        dateOfBirth: dob || null,
        citizenId,
        citizenshipStatus: "Active",
        joinedAt: new Date().toISOString(),
        uselessPoints: 0,
        rank: getRank(0),
        applicationCount: 0,
        reason: reason || null,
        experiencedBureaucracy:
          experiencedBureaucracy || null,
        createdAt: serverTimestamp(),
      };

      const notificationData = {
        userId: uid,
        title: "Welcome to the Ministry",
        message:
          `Congratulations, ${cleanName}. ` +
          `Your citizenship application has been approved. ` +
          `Your Citizen ID is ${citizenId}. ` +
          `The Ministry welcomes your participation ` +
          `in completely unnecessary affairs.`,
        read: false,
        type: "welcome",
        createdAt: serverTimestamp(),
      };

      /* ========================================================
         4. CACHE LOCALLY & SYNC FIRESTORE ASYNCHRONOUSLY
         ======================================================== */

      // Cache citizen info locally so the citizen data is immediately accessible with 0ms delay
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`mua_citizen_${uid}`, JSON.stringify(citizenData));
        } catch (e) {
          console.warn("MUA — Could not cache citizen locally:", e);
        }
      }

      // Sync with Firestore before redirecting to guarantee the document exists
      try {
        await Promise.all([
          setDoc(doc(db, "citizens", uid), citizenData),
          setDoc(doc(db, "notifications", `${uid}_welcome`), notificationData),
        ]);
        console.log("MUA — Firestore citizen documents confirmed.");
      } catch (err) {
        console.warn("MUA — Background Firestore sync delayed/unavailable:", err);
      }

      console.log("MUA — Registration completed.");

      /* ========================================================
         SUCCESS — FULL FRESH RELOAD
         ======================================================== */

      window.location.href = "/citizen-portal";

    } catch (error: any) {
      console.error(
        "MUA Registration Error:",
        error
      );

      let message =
        "The Ministry could not process your application.";

      switch (error?.code) {
        case "auth/email-already-in-use":
          message =
            "A citizen account already exists with this email address.";
          break;

        case "auth/invalid-email":
          message =
            "Please enter a valid email address.";
          break;

        case "auth/weak-password":
          message =
            "Your password is too weak. Please use at least 6 characters.";
          break;

        case "auth/network-request-failed":
          message =
            "Network error while contacting Firebase. Please check your internet connection.";
          break;

        case "auth/operation-not-allowed":
          message =
            "Email/password authentication is not enabled in Firebase.";
          break;

        case "auth/too-many-requests":
          message =
            "Too many attempts have been made. Please wait and try again.";
          break;

        case "permission-denied":
        case "firestore/permission-denied":
          message =
            "Firestore rejected the request. Please check your Firestore security rules.";
          break;

        case "unavailable":
        case "firestore/unavailable":
          message =
            "The Ministry database is temporarily unavailable. Please try again.";
          break;

        case "failed-precondition":
        case "firestore/failed-precondition":
          message =
            "Firestore is not configured correctly.";
          break;

        default:
          message =
            error?.message ||
            "Registration failed.";
      }

      alert(
        `REGISTRATION FAILED\n\n${message}`
      );

    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     UI
     ============================================================ */

  return (
    <main className="fixed inset-0 z-[9999] h-screen w-screen overflow-hidden bg-[#f4efe4] text-[#172235]">

      {/* ========================================================
          BACKGROUND DECORATION
      ======================================================== */}

      <div className="pointer-events-none absolute -left-28 top-[35%] hidden h-64 w-64 rotate-12 border-[11px] border-[#e8c878] opacity-55 xl:block" />

      <div className="pointer-events-none absolute -bottom-32 -right-28 hidden h-80 w-80 rounded-full border-[20px] border-[#9b1c31] opacity-45 xl:block" />

      <div className="pointer-events-none absolute right-[44%] top-[25%] hidden grid-cols-5 gap-2 opacity-15 xl:grid">
        {Array.from({ length: 25 }).map((_, i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-[#172235]"
          />
        ))}
      </div>

      {/* ========================================================
          TOP GOVERNMENT STRIP
      ======================================================== */}

      <div className="absolute left-0 right-0 top-0 z-50 flex h-8 items-center justify-center bg-[#172235] px-4 text-center text-[8px] font-black uppercase tracking-[0.2em] text-[#e8c878] sm:text-[9px]">
        Government of Useless Affairs

        <span className="mx-2 text-white/30">
          •
        </span>

        Official Citizen Registration Portal
      </div>

      {/* ========================================================
          HEADER
      ======================================================== */}

      <header className="absolute left-0 right-0 top-8 z-50 h-[82px] border-b-[3px] border-[#9b1c31] bg-[#fffaf0]">

        <div className="mx-auto flex h-full max-w-[1500px] items-center justify-between px-6 sm:px-8 lg:px-10">

          <Link
            href="/"
            className="flex h-full min-w-0 items-center gap-3"
          >
            <img
              src="/mua-logo.png"
              alt="Ministry of Useless Affairs"
              className="h-10 w-10 shrink-0 object-contain sm:h-[60px] sm:w-[60px]"
            />

            <div className="min-w-0">

              <p className="truncate text-[8px] font-black uppercase tracking-[0.12em] sm:tracking-[0.18em] text-[#9b1c31]">
                Republic of Questionable Decisions
              </p>

              <h1 className="truncate font-serif text-[15px] font-black uppercase tracking-normal sm:tracking-wide text-[#172235] sm:text-xl">
                Ministry of Useless Affairs
              </h1>

            </div>
          </Link>

          <div className="hidden shrink-0 text-right sm:block">

            <p className="text-[9px] font-black uppercase tracking-[0.18em]">
              Citizen Registration
            </p>

            <p className="mt-1 text-[9px] text-[#818792]">
              Form MUA-CITIZEN/01
            </p>

          </div>

        </div>

      </header>

      {/* ========================================================
          MAIN CONTENT
      ======================================================== */}

      <section className="relative lg:absolute lg:bottom-0 lg:left-0 lg:right-0 lg:top-[113px] overflow-y-auto lg:overflow-hidden py-6 sm:py-10 lg:py-0">

        <div className="mx-auto grid min-h-full lg:h-full max-w-[1500px] grid-cols-1 items-center gap-10 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_570px] lg:gap-14 lg:px-10">

          {/* ====================================================
              LEFT SIDE
          ==================================================== */}

          <div className="relative z-10 hidden min-w-0 lg:block">

            <div className="mb-5 flex items-center gap-5">

              <div className="relative flex h-[120px] w-[120px] shrink-0 items-center justify-center">

                <div className="absolute inset-0 rounded-full border-2 border-[#c9a44b]" />

                <div className="absolute inset-[8px] rounded-full border border-dashed border-[#9b1c31]" />

                <img
                  src="/mua-logo.png"
                  alt="Ministry emblem"
                  className="relative h-[100px] w-[100px] object-contain"
                />

              </div>

              <div>

                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#9b1c31]">
                  Official Ministry Emblem
                </p>

                <div className="mt-1 h-[2px] w-20 bg-[#c9a44b]" />

                <p className="mt-2 max-w-[260px] font-serif text-[15px] font-bold leading-5 text-[#6f7680]">
                  Welcome to the administrative family.
                </p>

              </div>

            </div>

            <div className="mb-5 inline-flex items-center gap-2 rounded-md border-2 border-[#172235] bg-[#e8c878] px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.17em] shadow-[4px_4px_0_#172235]">

              <span>📋</span>

              Citizenship Application

            </div>

            <h2 className="max-w-[650px] font-serif text-[52px] font-black leading-[0.92] tracking-[-0.025em] xl:text-[60px]">

              Apply to become a

              <br />

              <span className="text-[#9b1c31]">
                distinguished citizen.
              </span>

            </h2>

            <div className="mt-7 max-w-[600px] overflow-hidden rounded-xl border-2 border-[#172235] bg-[#fffaf0] shadow-[6px_6px_0_#172235]">

              <div className="flex h-11 items-center justify-between bg-[#172235] px-5">

                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#e8c878]">
                  📢 Important Notice
                </span>

                <span className="text-[9px] font-bold text-white/40">
                  NOTICE #001
                </span>

              </div>

              <div className="px-6 py-5">

                <p className="font-serif text-[19px] font-bold leading-7">
                  "Citizenship comes with absolutely no responsibilities that we can clearly define."
                </p>

                <div className="mt-4 flex items-center gap-3">

                  <span className="h-px w-9 bg-[#9b1c31]" />

                  <span className="text-[8px] font-black uppercase tracking-[0.14em] text-[#7e858f]">
                    Department of Questionable Eligibility
                  </span>

                </div>

              </div>

            </div>

            <div className="mt-6 flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 rotate-[-7deg] items-center justify-center rounded-full border-2 border-dashed border-[#9b1c31] text-center text-[7px] font-black uppercase leading-3 text-[#9b1c31]">
                MUA
                <br />
                APPROVED
              </div>

              <div>

                <p className="text-[10px] font-black uppercase tracking-[0.16em]">
                  Before applying
                </p>

                <p className="mt-1 max-w-[430px] text-xs leading-5 text-[#7c838e]">
                  Please ensure your information is accurate,
                  your password is memorable, and your expectations
                  regarding government efficiency remain appropriately low.
                </p>

              </div>

            </div>

          </div>

          {/* ====================================================
              REGISTRATION CARD
          ==================================================== */}

          <div className="mx-auto w-full max-w-[570px] lg:ml-auto">

            <div className="overflow-hidden rounded-2xl border-2 border-[#172235] bg-[#fffaf0] shadow-[9px_9px_0_#172235]">

              {/* CARD HEADER */}

              <div className="border-b-2 border-[#172235] bg-[#172235] px-5 py-4 text-white sm:px-8 sm:py-5">

                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#e8c878]">
                  Form MUA-CITIZEN/01
                </p>

                <h3 className="mt-1 font-serif text-[24px] font-black sm:text-[31px]">
                  Citizenship Application
                </h3>

              </div>

              {/* CARD BODY */}

              <div className="px-5 py-5 sm:px-8">

                <form onSubmit={handleSubmit}>

                  {/* NAME + DOB */}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_150px]">

                    <div>

                      <label
                        htmlFor="fullName"
                        className="mb-2 block text-[10px] font-black uppercase tracking-[0.17em]"
                      >
                        Full Name *
                      </label>

                      <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) =>
                          setFullName(e.target.value)
                        }
                        placeholder="Your distinguished name"
                        required
                        disabled={loading}
                        className="h-12 w-full rounded-lg border-2 border-[#172235] bg-white px-4 text-[13px] outline-none transition placeholder:text-[#9ca3ad] focus:bg-[#fff8d9] focus:shadow-[3px_3px_0_#e8c878] disabled:opacity-60"
                      />

                    </div>

                    <div>

                      <label
                        htmlFor="dob"
                        className="mb-2 block text-[10px] font-black uppercase tracking-[0.17em]"
                      >
                        Date of Birth
                      </label>

                      <input
                        id="dob"
                        type="date"
                        value={dob}
                        onChange={(e) =>
                          setDob(e.target.value)
                        }
                        disabled={loading}
                        className="h-12 w-full rounded-lg border-2 border-[#172235] bg-white px-3 text-[12px] outline-none transition focus:bg-[#fff8d9] focus:shadow-[3px_3px_0_#e8c878] disabled:opacity-60"
                      />

                    </div>

                  </div>

                  {/* EMAIL */}

                  <div className="mt-4">

                    <label
                      htmlFor="email"
                      className="mb-2 block text-[10px] font-black uppercase tracking-[0.17em]"
                    >
                      Email Address *
                    </label>

                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="citizen@example.com"
                      required
                      disabled={loading}
                      className="h-12 w-full rounded-lg border-2 border-[#172235] bg-white px-4 text-[13px] outline-none transition placeholder:text-[#9ca3ad] focus:bg-[#fff8d9] focus:shadow-[3px_3px_0_#e8c878] disabled:opacity-60"
                    />

                  </div>

                  {/* PASSWORD */}

                  <div className="mt-4">

                    <label
                      htmlFor="password"
                      className="mb-2 block text-[10px] font-black uppercase tracking-[0.17em]"
                    >
                      Password *
                    </label>

                    <div className="relative">

                      <input
                        id="password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) =>
                          setPassword(e.target.value)
                        }
                        placeholder="At least 6 characters"
                        required
                        disabled={loading}
                        className="h-12 w-full rounded-lg border-2 border-[#172235] bg-white px-4 pr-16 text-[13px] outline-none transition placeholder:text-[#9ca3ad] focus:bg-[#fff8d9] focus:shadow-[3px_3px_0_#e8c878] disabled:opacity-60"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (current) => !current
                          )
                        }
                        disabled={loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-[8px] font-black uppercase hover:bg-[#eee8dc]"
                      >
                        {showPassword
                          ? "Hide"
                          : "Show"}
                      </button>

                    </div>

                  </div>

                  {/* CONFIRM PASSWORD */}

                  <div className="mt-4">

                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-[10px] font-black uppercase tracking-[0.17em]"
                    >
                      Confirm Password *
                    </label>

                    <div className="relative">

                      <input
                        id="confirmPassword"
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) =>
                          setConfirmPassword(e.target.value)
                        }
                        placeholder="Please repeat the paperwork"
                        required
                        disabled={loading}
                        className="h-12 w-full rounded-lg border-2 border-[#172235] bg-white px-4 pr-16 text-[13px] outline-none transition placeholder:text-[#9ca3ad] focus:bg-[#fff8d9] focus:shadow-[3px_3px_0_#e8c878] disabled:opacity-60"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            (current) => !current
                          )
                        }
                        disabled={loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-[8px] font-black uppercase hover:bg-[#eee8dc]"
                      >
                        {showConfirmPassword
                          ? "Hide"
                          : "Show"}
                      </button>

                    </div>

                  </div>

                  {/* REASON */}

                  <div className="mt-4">

                    <label
                      htmlFor="reason"
                      className="mb-2 block text-[10px] font-black uppercase tracking-[0.17em]"
                    >
                      Why do you want citizenship?
                    </label>

                    <select
                      id="reason"
                      value={reason}
                      onChange={(e) =>
                        setReason(e.target.value)
                      }
                      disabled={loading}
                      className="h-12 w-full rounded-lg border-2 border-[#172235] bg-white px-4 text-[12px] outline-none transition focus:bg-[#fff8d9] focus:shadow-[3px_3px_0_#e8c878] disabled:opacity-60"
                    >
                      <option value="">
                        Select an appropriately useless reason
                      </option>

                      <option value="complaints">
                        I have complaints to submit
                      </option>

                      <option value="certificates">
                        I require unnecessary certificates
                      </option>

                      <option value="tracking">
                        I enjoy tracking applications
                      </option>

                      <option value="bored">
                        I was bored
                      </option>

                      <option value="other">
                        Other questionable reasons
                      </option>
                    </select>

                  </div>

                  {/* BUREAUCRACY */}

                  <div className="mt-4">

                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.17em]">
                      Have you experienced unnecessary bureaucracy before?
                    </p>

                    <div className="grid grid-cols-2 gap-3">

                      {[
                        ["yes", "✓ Yes, extensively"],
                        ["no", "✕ Somehow no"],
                      ].map(([value, label]) => (

                        <label
                          key={value}
                          className={`flex h-11 cursor-pointer items-center justify-center rounded-lg border-2 text-[10px] font-black uppercase tracking-wider transition ${experiencedBureaucracy === value
                            ? "border-[#9b1c31] bg-[#f5dfe3] text-[#9b1c31]"
                            : "border-[#172235] bg-white hover:bg-[#eee8dc]"
                            }`}
                        >

                          <input
                            type="radio"
                            name="bureaucracy"
                            value={value}
                            checked={
                              experiencedBureaucracy === value
                            }
                            onChange={(e) =>
                              setExperiencedBureaucracy(
                                e.target.value
                              )
                            }
                            className="sr-only"
                          />

                          {label}

                        </label>

                      ))}

                    </div>

                  </div>

                  {/* DECLARATION */}

                  <label className="mt-4 flex cursor-pointer items-start gap-3">

                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) =>
                        setAgree(e.target.checked)
                      }
                      disabled={loading}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#9b1c31]"
                    />

                    <span className="text-[9px] leading-4 text-[#707783]">
                      I confirm that the information provided above
                      is reasonably accurate and that I understand
                      citizenship may result in receiving additional
                      forms, notifications, and completely unnecessary
                      administrative responsibilities.
                    </span>

                  </label>

                  {/* SUBMIT */}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-5 h-13 w-full rounded-lg border-2 border-[#172235] bg-[#9b1c31] py-3.5 text-[11px] font-black uppercase tracking-[0.11em] text-white shadow-[5px_5px_0_#172235] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#172235] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading
                      ? "Processing Application..."
                      : "Submit Citizenship Application →"}
                  </button>

                </form>

                {/* LOGIN */}

                <div className="mt-4 border-t border-[#ded8cc] pt-4 text-center">

                  <p className="text-[9px] text-[#777e89]">
                    Already a distinguished citizen?
                  </p>

                  <Link
                    href="/login"
                    className="mt-1 inline-block text-[11px] font-black text-[#9b1c31] underline underline-offset-4 transition hover:text-[#6f1020]"
                  >
                    Return to Citizen Login →
                  </Link>

                </div>

              </div>

              {/* CARD FOOTER */}

              <div className="border-t-2 border-[#172235] bg-[#eee8dc] px-7 py-3">

                <div className="flex justify-between text-[7px] font-black uppercase tracking-[0.1em] text-[#747a85]">

                  <span>
                    Classification: Public
                  </span>

                  <span>
                    ☑ Ministry Approved Form
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* ========================================================
          FOOTER
      ======================================================== */}

      <footer className="absolute bottom-0 left-0 right-0 z-40 hidden h-5 border-t border-[#d5cfc3] bg-[#fffaf0] px-6 lg:block">

        <div className="mx-auto flex h-full max-w-[1500px] items-center justify-between text-[7px] font-bold uppercase tracking-[0.12em] text-[#858b96]">

          <span>
            Ministry of Useless Affairs · Department of Digital Inefficiency
          </span>

          <span>
            Your application will be unnecessarily important.
          </span>

        </div>

      </footer>

    </main>
  );
}