import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import {
  VALID_MINISTRY_DEPARTMENTS,
  GeminiNoticeBatchSchema,
  StoredMinistryNotice,
} from "@/lib/notice-schema";
import fs from "fs";
import path from "path";

const ADMIN_SECRET = "MUA-OFFICIAL-ADMIN-SECRET-2026";
const MINIMUM_ACTIVE_NOTICES = 6;
const GENERATION_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes minimum cooldown

// In-memory process lock
let isGenerating = false;
let lastGenerationTime = 0;
let inMemoryNoticesCache: StoredMinistryNotice[] = [];

// Persistent server-side file cache to ensure all citizens see the same notices
const CACHE_DIR = path.join(process.cwd(), ".next", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "mua-notices-feed.json");

function readServerCache(): StoredMinistryNotice[] {
  if (inMemoryNoticesCache.length > 0) {
    return inMemoryNoticesCache;
  }
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, "utf8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryNoticesCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    // Cache read failure is non-fatal
  }
  return [];
}

function writeServerCache(notices: StoredMinistryNotice[]): void {
  inMemoryNoticesCache = notices;
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(notices, null, 2), "utf8");
  } catch (e) {
    // Cache write failure is non-fatal
  }
}

/**
 * Parses any date value into a valid Date object.
 */
export function parseDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val?.toDate === "function") return val.toDate();
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Filter out expired notices based on server time.
 */
export function filterActiveNotices(notices: StoredMinistryNotice[]): StoredMinistryNotice[] {
  const now = Date.now();
  return notices.filter((n) => {
    if (!n.expiresAt) return true;
    const exp = parseDate(n.expiresAt);
    return exp.getTime() > now;
  });
}

/**
 * Reads existing notices from Firestore (with server cache fallback).
 */
export async function fetchCurrentNotices(): Promise<StoredMinistryNotice[]> {
  try {
    const noticesRef = collection(db, "notices");
    const q = query(noticesRef, orderBy("publishedAt", "desc"), limit(40));
    let snap;
    try {
      snap = await getDocs(q);
    } catch (orderErr) {
      snap = await getDocs(noticesRef);
    }

    if (snap && !snap.empty) {
      const firestoreNotices: StoredMinistryNotice[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || "Official Ministry Circular",
          department: data.department || "Department of Bureaucratic Affairs",
          message: data.message || "",
          priority: data.priority || "Normal",
          category: data.category || "General",
          publishedAt:
            data.publishedAt ||
            data.createdAt?.toDate?.()?.toISOString() ||
            new Date().toISOString(),
          expiresAt: data.expiresAt || null,
          generatedBy: "gemini",
        };
      });

      firestoreNotices.sort(
        (a, b) => parseDate(b.publishedAt).getTime() - parseDate(a.publishedAt).getTime()
      );

      writeServerCache(firestoreNotices);
      return firestoreNotices;
    }
  } catch (err) {
    // Firestore might be unseeded or permissions restricted
  }

  return readServerCache();
}

/**
 * Calls Gemini 3.5 Flash-Lite to generate 8-12 hilarious, authentic government notices.
 * Validates strictly using Zod.
 */
async function callGeminiForNotices(): Promise<StoredMinistryNotice[]> {
  const gemini = getGeminiClient();

  const systemInstruction = `You are the official communications department of the fictional MINISTRY OF USELESS AFFAIRS (MUA), operating within the Department of Completely Unnecessary Governance.
Authoritatively formulate official government notices, directives, executive circulars, and administrative warnings.

MANDATORY TONE & PHILOSOPHY:
- Deeply bureaucratic, excessively formal, unnecessarily serious, subtly satirical, and delightfully absurd.
- Every notice must sound like a real government decree regarding something utterly trivial or completely unnecessary.
- Examples: triple-stamped forms required to submit another form, mandatory waiting periods before requesting forms, prohibition of unauthorized problem-solving, official classifications of lost paperclips or single socks, protocols for lukewarm beverages, scheduled delays of scheduled delays, mandatory walking paces in corridors, vague public complaints.

AVAILABLE DEPARTMENTS:
${VALID_MINISTRY_DEPARTMENTS.map((d) => `- "${d}"`).join("\n")}

OUTPUT REQUIREMENT:
You must output a STRICT JSON ARRAY of 7 objects. No markdown wraps or commentary.`;

  const userPrompt = `GENERATE EXACTLY 7 OFFICIAL MINISTRY NOTICES.
REQUIREMENTS:
- Distribute across 7 DIFFERENT departments from the allowed list.
- Each notice must have:
  - "department": One of the allowed departments exactly
  - "title": Formal, funny government title (e.g., "Directive 74-C: Mandatory Stagnation Protocol at Service Counters")
  - "message": Exactly 1 to 2 crisp, deadpan, hilariously unnecessary sentences of government instructions.
  - "priority": "Normal" | "Important" | "Urgent"
  - "category": Formal category string (e.g., "Queue Procedures", "Form Compliance", "Administrative Logistics", "Grievance Reclassification")
  - "validDays": Integer between 5 and 30

Return ONLY the JSON array.`;

  let attempts = 0;
  let rawResponse = "";

  while (attempts < 2) {
    attempts++;
    try {
      const response = await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });

      rawResponse = response.text || "[]";
      const parsedJson = JSON.parse(rawResponse);

      // Validate with Zod
      const validated = GeminiNoticeBatchSchema.safeParse(parsedJson);

      if (validated.success) {
        const timestamp = Date.now();
        const created: StoredMinistryNotice[] = validated.data.map((item, index) => {
          const publishedAt = new Date(timestamp - index * 120000).toISOString();
          const expiresAt = new Date(timestamp + item.validDays * 86400000).toISOString();
          const id = `MUA-NOT-${timestamp}-${100 + index}`;

          return {
            id,
            title: item.title.trim(),
            department: item.department.trim(),
            message: item.message.trim(),
            priority: item.priority,
            category: item.category.trim(),
            publishedAt,
            expiresAt,
            generatedBy: "gemini",
          };
        });

        return created;
      } else {
        console.warn("Zod validation failure on notices attempt", attempts, validated.error.format());
      }
    } catch (apiErr) {
      console.error("MUA Notice Generation attempt error:", attempts, apiErr);
    }
  }

  throw new Error("Unable to produce a valid batch of Ministry notices.");
}

/**
 * Guarantees that the Ministry has sufficient active, AI-generated notices.
 * Implements strict duplicate prevention and server-side locking.
 */
export async function getOrGenerateNotices(forceRefresh: boolean = false): Promise<{
  notices: StoredMinistryNotice[];
  generatedFresh: boolean;
}> {
  // 1. Fetch current notices from Firestore/cache
  const currentNotices = await fetchCurrentNotices();
  const activeNotices = filterActiveNotices(currentNotices);

  // 2. If we already have enough active notices and NOT forced, return immediately
  if (!forceRefresh && activeNotices.length >= MINIMUM_ACTIVE_NOTICES) {
    return {
      notices: activeNotices,
      generatedFresh: false,
    };
  }

  // 3. Check duplicate prevention lock & cooldown
  const now = Date.now();
  if (isGenerating) {
    // Another concurrent request is already generating
    console.info("MUA Notice Generation already in progress by concurrent request. Serving current cache.");
    return {
      notices: activeNotices.length > 0 ? activeNotices : currentNotices,
      generatedFresh: false,
    };
  }

  if (!forceRefresh && now - lastGenerationTime < GENERATION_COOLDOWN_MS && currentNotices.length > 0) {
    console.info("MUA Notice Generation cooldown active. Reusing existing batch.");
    return {
      notices: currentNotices,
      generatedFresh: false,
    };
  }

  // 4. Acquire generation lock
  isGenerating = true;
  lastGenerationTime = now;

  try {
    console.info("MUA Notice Service: Generating autonomous batch with Gemini 3.5 Flash-Lite...");
    const freshNotices = await callGeminiForNotices();

    // 5. Store generated notices asynchronously in Firestore
    for (const notice of freshNotices) {
      try {
        await setDoc(doc(db, "notices", notice.id), {
          ...notice,
          adminSecret: ADMIN_SECRET,
          createdAt: serverTimestamp(),
        });
      } catch (saveErr) {
        // Handled silently if cloud rules reject write
      }
    }

    // Try to update generation metadata
    try {
      await setDoc(
        doc(db, "noticesMeta", "generation"),
        {
          lastGeneratedAt: serverTimestamp(),
          batchSize: freshNotices.length,
          generationInProgress: false,
        },
        { merge: true }
      );
    } catch {}

    // Merge with any existing active notices and write to server cache
    const merged = [...freshNotices, ...currentNotices];
    const uniqueMap = new Map<string, StoredMinistryNotice>();
    merged.forEach((n) => uniqueMap.set(n.id, n));
    const sorted = Array.from(uniqueMap.values()).sort(
      (a, b) => parseDate(b.publishedAt).getTime() - parseDate(a.publishedAt).getTime()
    );

    writeServerCache(sorted);
    const resultActive = filterActiveNotices(sorted);

    return {
      notices: resultActive,
      generatedFresh: true,
    };
  } catch (genErr) {
    console.error("MUA Notice Service Error:", genErr);
    // If generation fails, return whatever current notices we have
    return {
      notices: activeNotices.length > 0 ? activeNotices : currentNotices,
      generatedFresh: false,
    };
  } finally {
    isGenerating = false;
  }
}
