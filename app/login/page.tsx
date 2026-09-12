"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getRank } from "@/lib/ranks";

/* ============================================================
   MINISTRY QUOTES
   ============================================================ */

const ministryQuotes = [
  {
    quote:
      "We investigated your complaint thoroughly. Unfortunately, the complaint was about us.",
    department: "Department of Internal Affairs",
  },
  {
    quote:
      "Your issue has been escalated to someone who has absolutely no idea what to do with it.",
    department: "Office of Administrative Escalation",
  },
  {
    quote:
      "Congratulations. Your complaint is now officially someone else's problem.",
    department: "Department of Strategic Delegation",
  },
  {
    quote:
      "We have received your application. Please allow 3–5 business days for us to decide what to do with it.",
    department: "Ministry of Delayed Decisions",
  },
  {
    quote:
      "The queue is moving. We are not sure where, but technically it is moving.",
    department: "National Queue Management Authority",
  },
  {
    quote:
      "Your patience is appreciated. Your impatience has also been documented.",
    department: "Bureau of Citizen Behaviour",
  },
  {
    quote:
      "Please do not submit duplicate complaints. We already have enough paperwork to build a small house.",
    department: "Department of Excessive Documentation",
  },
  {
    quote:
      "We cannot solve your problem, but we can give you a beautifully formatted Case ID.",
    department: "Office of Case Numbers",
  },
  {
    quote:
      "Important announcement: absolutely nothing important has happened today.",
    department: "Ministry of Completely Unnecessary Updates",
  },
  {
    quote:
      "Your request is important to us. Unfortunately, so are our lunch breaks.",
    department: "Department of Working Hours",
  },
  {
    quote:
      "If your problem disappears, please do not report it. We have already closed the case.",
    department: "Bureau of Premature Resolutions",
  },
  {
    quote:
      "Every great citizen deserves great service. We are currently working on the definition of great.",
    department: "Ministry of Service Quality",
  },
  {
    quote:
      "We don't lose applications. We simply give them exciting new locations.",
    department: "Department of Document Relocation",
  },
  {
    quote:
      "Please remain calm. An officer has been assigned to think about your situation.",
    department: "Office of Serious Thinking",
  },
  {
    quote:
      "Your inconvenience has been officially recognized. You may now continue being inconvenienced.",
    department: "National Inconvenience Registry",
  },
  {
    quote:
      "Not every problem needs a solution. Some need a form, three signatures, and a Case ID.",
    department: "Department of Unnecessary Procedures",
  },
  {
    quote:
      "We asked the committee. The committee asked another committee. Progress is being made.",
    department: "Inter-Ministerial Committee for Committee Affairs",
  },
  {
    quote:
      "Please check your application status regularly. It enjoys knowing that someone cares.",
    department: "Application Monitoring Division",
  },
  {
    quote:
      "A missing charger is not just a personal tragedy. It is an administrative opportunity.",
    department: "Department of Missing Possessions",
  },
  {
    quote:
      "The Ministry believes every problem has a solution. The Ministry has not found yours yet.",
    department: "Office of Optimistic Bureaucracy",
  },
];

/* ============================================================
   LOGIN PAGE
   ============================================================ */

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);

  /* ============================================================
     AUTOMATIC QUOTE ROTATION
     ============================================================ */

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false);

      setTimeout(() => {
        setQuoteIndex(
          (current) => (current + 1) % ministryQuotes.length
        );

        setQuoteVisible(true);
      }, 400);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  /* Clear any lingering session when landing on login page */
  useEffect(() => {
    if (auth.currentUser) {
      signOut(auth).catch(() => {});
    }
  }, []);

  const quote = ministryQuotes[quoteIndex];

  /* ============================================================
     FIREBASE EMAIL/PASSWORD LOGIN
     ============================================================ */

  const handleLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!email || !password) {
      alert(
        "APPLICATION REJECTED\n\n" +
          "Please enter your email and password.\n\n" +
          "The Ministry requires at least this much effort."
      );

      return;
    }

    try {
      setLoading(true);

      /* Remember Me */

      await setPersistence(
        auth,
        rememberMe
          ? browserLocalPersistence
          : browserSessionPersistence
      );

      /* Firebase Login */

      await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      /* Login successful */

      window.location.href = "/citizen-portal";
    } catch (error: any) {
      console.error(
        "Firebase Login Error:",
        error
      );

      let message =
        "The Ministry could not authenticate your credentials.";

      switch (error.code) {
        case "auth/invalid-credential":
          message =
            "Invalid email or password.";
          break;

        case "auth/user-not-found":
          message =
            "No citizen account was found with this email.";
          break;

        case "auth/wrong-password":
          message =
            "Incorrect password.";
          break;

        case "auth/too-many-requests":
          message =
            "Too many login attempts. Please try again later.";
          break;

        case "auth/network-request-failed":
          message =
            "Network error. Please check your internet connection.";
          break;

        case "auth/invalid-email":
          message =
            "Please enter a valid email address.";
          break;

        default:
          message =
            error.message ||
            "Authentication failed.";
      }

      alert(
        `LOGIN FAILED\n\n${message}`
      );
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     GOOGLE LOGIN
     ============================================================ */

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      await setPersistence(
        auth,
        rememberMe
          ? browserLocalPersistence
          : browserSessionPersistence
      );

      const provider =
        new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });

      const result = await signInWithPopup(
        auth,
        provider
      );

      /* Ensure citizen document exists in Firestore for Google accounts */
      const user = result.user;
      if (user) {
        try {
          const citizenRef = doc(db, "citizens", user.uid);
          const snap = await getDoc(citizenRef);
          if (!snap.exists()) {
            let hash = 0;
            for (let i = 0; i < user.uid.length; i++) {
              hash = (hash * 31 + user.uid.charCodeAt(i)) % 900000;
            }
            const citizenNum = 100000 + Math.abs(hash);
            const citizenData = {
              uid: user.uid,
              fullName: user.displayName || user.email?.split("@")[0] || "Distinguished Citizen",
              email: user.email || "",
              citizenId: `MUA-${new Date().getFullYear()}-${citizenNum}`,
              citizenshipStatus: "Active",
              joinedAt: new Date().toISOString(),
              uselessPoints: 0,
              rank: getRank(0),
              applicationCount: 0,
            };

            if (typeof window !== "undefined") {
              try {
                if (!localStorage.getItem(`mua_citizen_${user.uid}`)) {
                  localStorage.setItem(`mua_citizen_${user.uid}`, JSON.stringify(citizenData));
                }
              } catch {}
            }

            await setDoc(citizenRef, {
              ...citizenData,
              createdAt: serverTimestamp(),
            });
          }
        } catch (initErr) {
          console.warn("Could not ensure Google citizen doc in Firestore:", initErr);
        }
      }

      /* Google login successful */

      window.location.href = "/citizen-portal";
    } catch (error: any) {
      console.error(
        "Google Login Error:",
        error
      );

      /* User closed popup */

      if (
        error.code ===
        "auth/popup-closed-by-user"
      ) {
        return;
      }

      alert(
        "GOOGLE LOGIN FAILED\n\n" +
          (
            error.message ||
            "The Ministry could not authenticate your Google account."
          )
      );
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     FORGOT PASSWORD
     ============================================================ */

  const handleForgotPassword = async () => {
    if (!email) {
      alert(
        "PASSWORD RECOVERY\n\n" +
          "Please enter your email address first."
      );

      return;
    }

    try {
      setLoading(true);

      await sendPasswordResetEmail(
        auth,
        email.trim()
      );

      alert(
        "PASSWORD RESET REQUESTED\n\n" +
          `A password reset email has been sent to:\n${email}\n\n` +
          "Please check your inbox."
      );
    } catch (error: any) {
      console.error(
        "Password Reset Error:",
        error
      );

      let message =
        "The Ministry could not process the password reset.";

      switch (error.code) {
        case "auth/user-not-found":
          message =
            "No citizen account was found with this email.";
          break;

        case "auth/invalid-email":
          message =
            "Please enter a valid email address.";
          break;

        case "auth/network-request-failed":
          message =
            "Network error. Please check your internet connection.";
          break;

        default:
          message =
            error.message ||
            "Password reset failed.";
      }

      alert(
        `PASSWORD RESET FAILED\n\n${message}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fixed inset-0 z-[9999] h-screen w-screen overflow-hidden bg-[#f4efe4] text-[#172235]">

      {/* ========================================================
          BACKGROUND DECORATION
      ======================================================== */}

      <div className="pointer-events-none absolute -left-28 top-[30%] hidden h-64 w-64 rotate-12 border-[11px] border-[#e8c878] opacity-55 xl:block" />

      <div className="pointer-events-none absolute -bottom-32 -right-28 hidden h-80 w-80 rounded-full border-[20px] border-[#9b1c31] opacity-45 xl:block" />

      <div className="pointer-events-none absolute right-[42%] top-[25%] hidden grid-cols-5 gap-2 opacity-15 xl:grid">
        {Array.from({ length: 25 }).map(
          (_, index) => (
            <span
              key={index}
              className="h-2 w-2 rounded-full bg-[#172235]"
            />
          )
        )}
      </div>

      {/* ========================================================
          TOP GOVERNMENT STRIP
      ======================================================== */}

      <div className="absolute left-0 right-0 top-0 z-50 flex h-8 items-center justify-center bg-[#172235] px-4 text-center text-[8px] font-black uppercase tracking-[0.2em] text-[#e8c878] sm:text-[9px]">

        Government of Useless Affairs

        <span className="mx-2 text-white/30">
          •
        </span>

        Official Citizen Portal

      </div>

      {/* ========================================================
          HEADER
      ======================================================== */}

      <header className="absolute left-0 right-0 top-8 z-50 h-[82px] border-b-[3px] border-[#9b1c31] bg-[#fffaf0]">

        <div className="mx-auto flex h-full max-w-[1500px] items-center justify-between px-6 sm:px-8 lg:px-10">

          {/* Ministry Branding */}

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

          {/* Page Information */}

          <div className="hidden shrink-0 text-right sm:block">

            <p className="text-[9px] font-black uppercase tracking-[0.18em]">
              Citizen Authentication
            </p>

            <p className="mt-1 text-[9px] text-[#818792]">
              Form MUA-LOGIN/01
            </p>

          </div>

        </div>

      </header>

      {/* ========================================================
          MAIN CONTENT
      ======================================================== */}

      <section className="relative lg:absolute lg:bottom-0 lg:left-0 lg:right-0 lg:top-[113px] overflow-y-auto lg:overflow-hidden py-6 sm:py-10 lg:py-0">

        <div className="mx-auto grid min-h-full lg:h-full max-w-[1500px] grid-cols-1 items-center gap-8 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_450px] lg:gap-12 lg:px-10">

          {/* ====================================================
              LEFT SIDE
          ==================================================== */}

          <div className="relative z-10 hidden min-w-0 lg:block">

            {/* Ministry Emblem */}

            <div className="mb-4 flex items-center gap-5">

              <div className="relative flex h-[125px] w-[125px] shrink-0 items-center justify-center">

                <div className="absolute inset-0 rounded-full border-2 border-[#c9a44b]" />

                <div className="absolute inset-[8px] rounded-full border border-dashed border-[#9b1c31]" />

                <img
                  src="/mua-logo.png"
                  alt="Ministry of Useless Affairs emblem"
                  className="relative h-[105px] w-[105px] object-contain"
                />

              </div>

              <div>

                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#9b1c31]">
                  Official Ministry Emblem
                </p>

                <div className="mt-1 h-[2px] w-20 bg-[#c9a44b]" />

                <p className="mt-2 max-w-[260px] font-serif text-[15px] font-bold leading-5 text-[#6f7680]">
                  Proudly administering absolutely unnecessary affairs.
                </p>

              </div>

            </div>

            {/* Authorized Badge */}

            <div className="mb-5 inline-flex items-center gap-2 rounded-md border-2 border-[#172235] bg-[#e8c878] px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.17em] shadow-[4px_4px_0_#172235]">

              <span>
                ⚠️
              </span>

              Authorized Citizens Only

            </div>

            {/* Main Heading */}

            <h2 className="max-w-[760px] font-serif text-[55px] font-black leading-[0.9] tracking-[-0.025em] xl:text-[63px]">

              Welcome back,

              <br />

              <span className="text-[#9b1c31]">
                distinguished citizen.
              </span>

            </h2>

            {/* Quote Card */}

            <div className="mt-7 max-w-[650px] overflow-hidden rounded-xl border-2 border-[#172235] bg-[#fffaf0] shadow-[6px_6px_0_#172235]">

              <div className="flex h-11 items-center justify-between bg-[#172235] px-5">

                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#e8c878]">
                  📜 Official Ministry Wisdom
                </span>

                <span className="text-[9px] font-bold text-white/40">
                  NOTICE #
                  {String(
                    quoteIndex + 1
                  ).padStart(3, "0")}
                </span>

              </div>

              <div
                className={`min-h-[165px] px-6 py-5 transition-all duration-500 ${
                  quoteVisible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-2 opacity-0"
                }`}
              >

                <p className="font-serif text-[20px] font-bold leading-8 xl:text-[22px]">
                  “{quote.quote}”
                </p>

                <div className="mt-4 flex items-center gap-3">

                  <span className="h-px w-9 bg-[#9b1c31]" />

                  <span className="text-[8px] font-black uppercase tracking-[0.14em] text-[#7e858f]">
                    {quote.department}
                  </span>

                </div>

                <div className="mt-4 flex items-center gap-1.5">

                  {ministryQuotes.map(
                    (_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          index === quoteIndex
                            ? "w-6 bg-[#9b1c31]"
                            : "w-1.5 bg-[#c7c2b8]"
                        }`}
                      />
                    )
                  )}

                  <span className="ml-2 text-[7px] font-bold uppercase tracking-widest text-[#a0a4aa]">
                    Automatic Ministry Broadcast
                  </span>

                </div>

              </div>

            </div>

            {/* Ministry Status */}

            <div className="mt-6 flex items-center gap-4">

              <div className="flex h-14 w-14 rotate-[-8deg] items-center justify-center rounded-full border-2 border-dashed border-[#9b1c31] text-center text-[7px] font-black uppercase leading-3 text-[#9b1c31]">

                Official
                <br />
                Enough

              </div>

              <div>

                <p className="text-[10px] font-black uppercase tracking-[0.16em]">
                  Ministry Status
                </p>

                <p className="mt-1 text-xs text-[#7c838e]">
                  Currently accepting complaints about minor inconveniences.
                </p>

              </div>

            </div>

          </div>

          {/* ====================================================
              LOGIN CARD
          ==================================================== */}

          <div className="mx-auto w-full max-w-[450px] lg:ml-auto">

            <div className="overflow-hidden rounded-2xl border-2 border-[#172235] bg-[#fffaf0] shadow-[9px_9px_0_#172235]">

              {/* =================================================
                  CARD HEADER
              ================================================= */}

              <div className="border-b-2 border-[#172235] bg-[#172235] px-5 py-4 text-white sm:px-8 sm:py-5">

                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#e8c878]">
                  Form MUA-LOGIN/01
                </p>

                <h3 className="mt-1 font-serif text-[26px] font-black sm:text-[32px]">
                  Citizen Login
                </h3>

              </div>

              {/* =================================================
                  CARD BODY
              ================================================= */}

              <div className="px-5 py-5 sm:px-8 sm:py-7">

                <form onSubmit={handleLogin}>

                  {/* EMAIL */}

                  <div>

                    <label
                      htmlFor="email"
                      className="mb-2.5 block text-[11px] font-black uppercase tracking-[0.18em]"
                    >
                      Email Address
                    </label>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      placeholder="citizen@example.com"
                      required
                      disabled={loading}
                      className="h-14 w-full rounded-lg border-2 border-[#172235] bg-white px-5 text-[15px] font-medium tracking-wide outline-none transition placeholder:text-[#9ca3ad] focus:bg-[#fff8d9] focus:shadow-[4px_4px_0_#e8c878] disabled:cursor-not-allowed disabled:opacity-60"
                    />

                  </div>

                  {/* PASSWORD */}

                  <div className="mt-5">

                    <div className="mb-2.5 flex items-center justify-between gap-3">

                      <label
                        htmlFor="password"
                        className="text-[11px] font-black uppercase tracking-[0.18em]"
                      >
                        Secret Password
                      </label>

                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={loading}
                        className="shrink-0 text-[9px] font-bold text-[#9b1c31] underline underline-offset-3 disabled:opacity-50"
                      >
                        Forgot password?
                      </button>

                    </div>

                    <div className="relative">

                      <input
                        id="password"
                        name="password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) =>
                          setPassword(
                            event.target.value
                          )
                        }
                        placeholder="Definitely not 123456"
                        required
                        disabled={loading}
                        className="h-14 w-full rounded-lg border-2 border-[#172235] bg-white px-5 pr-20 text-[15px] font-medium tracking-wide outline-none transition placeholder:text-[#9ca3ad] focus:bg-[#fff8d9] focus:shadow-[4px_4px_0_#e8c878] disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (current) =>
                              !current
                          )
                        }
                        disabled={loading}
                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[9px] font-black uppercase transition hover:bg-[#eee8dc] disabled:opacity-50"
                      >
                        {showPassword
                          ? "Hide"
                          : "Show"}
                      </button>

                    </div>

                  </div>

                  {/* REMEMBER ME */}

                  <label className="mt-5 flex cursor-pointer items-center gap-3">

                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) =>
                        setRememberMe(
                          event.target.checked
                        )
                      }
                      disabled={loading}
                      className="h-4 w-4 rounded accent-[#9b1c31]"
                    />

                    <span className="text-[10px] text-[#707783]">
                      Remember me until further notice
                    </span>

                  </label>

                  {/* LOGIN BUTTON */}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-6 h-14 w-full rounded-lg border-2 border-[#172235] bg-[#9b1c31] text-[12px] font-black uppercase tracking-[0.1em] text-white shadow-[5px_5px_0_#172235] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#172235] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading
                      ? "Officer Checking..."
                      : "Enter the Ministry →"}
                  </button>

                </form>

                {/* DIVIDER */}

                <div className="my-5 flex items-center gap-4">

                  <div className="h-px flex-1 bg-[#d8d2c6]" />

                  <span className="text-[9px] font-black uppercase tracking-widest text-[#969ba3]">
                    or
                  </span>

                  <div className="h-px flex-1 bg-[#d8d2c6]" />

                </div>

                {/* GOOGLE LOGIN */}

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-lg border-2 border-[#172235] bg-white text-[13px] font-bold shadow-[4px_4px_0_#d5d0c5] transition hover:bg-[#f5f5f5] hover:shadow-[5px_5px_0_#172235] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
                >

                  <span className="text-xl font-black text-[#4285F4]">
                    G
                  </span>

                  Continue with Google

                </button>

                {/* Firebase Information */}

                <p className="mt-2.5 text-center text-[8px] leading-4 text-[#9a9fa7]">
                  Secure authentication powered by
                  Firebase.
                </p>

                {/* REGISTER */}

                <div className="mt-5 border-t border-[#ded8cc] pt-4 text-center">

                  <p className="text-[10px] text-[#777e89]">
                    Not a registered citizen?
                  </p>

                  <Link
                    href="/register"
                    className="mt-1 inline-block text-[12px] font-black text-[#9b1c31] underline underline-offset-4 transition hover:text-[#6f1020]"
                  >
                    Apply for Citizenship →
                  </Link>

                </div>

              </div>

              {/* =================================================
                  CARD FOOTER
              ================================================= */}

              <div className="border-t-2 border-[#172235] bg-[#eee8dc] px-7 py-3">

                <div className="flex justify-between text-[7px] font-black uppercase tracking-[0.1em] text-[#747a85]">

                  <span>
                    Classification: Public
                  </span>

                  <span>
                    ☑ Very Official
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
            Nothing important happens here.
          </span>

        </div>

      </footer>

    </main>
  );
}