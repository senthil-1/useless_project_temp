import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import { verifyAuthToken } from "@/lib/server-auth";

export const ALLOWED_DEPARTMENTS = [
  "Department of Excessive Waiting",
  "Department of Unnecessary Paperwork",
  "Department of Minor Inconveniences",
  "Department of Lost Things",
  "Department of Government Confusion",
  "Department of Administrative Delays",
  "Department of Completely Unnecessary Requests",
  "Department of Public Complaints",
  "Department of Bureaucratic Affairs",
  "Department of Miscellaneous Uselessness",
] as const;

export const ALLOWED_STATUSES = [
  "Submitted",
  "Under Review",
  "Escalated",
  "Approved",
  "Rejected",
  "Resolved",
] as const;

interface AiResponseStructure {
  department: string;
  status: string;
  finalDecision: string;
  certificateTitle: string;
  certificateValue: string;
}

export async function POST(req: Request) {
  try {
    // 1. Verify Authentication
    const authUser = await verifyAuthToken(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated. Official citizen credentials required." },
        { status: 401 }
      );
    }

    // 2. Parse & Validate Request Body
    const body = await req.json().catch(() => null);
    if (!body || !body.caseId || !body.caseType) {
      return NextResponse.json(
        { success: false, error: "Invalid request. Missing caseId or caseType." },
        { status: 400 }
      );
    }

    const { caseId, caseType } = body;
    if (caseType !== "incident" && caseType !== "certificate") {
      return NextResponse.json(
        { success: false, error: "Invalid caseType. Must be 'incident' or 'certificate'." },
        { status: 400 }
      );
    }

    const collectionName = caseType === "incident" ? "incidents" : "certificateRequests";

    // 3. Read Case from Firestore
    const caseRef = doc(db, collectionName, caseId);
    let caseSnap;
    try {
      caseSnap = await getDoc(caseRef);
    } catch (dbErr: any) {
      console.warn("MUA AI — Could not read from Firestore directly:", dbErr);
    }

    let caseData: any = null;
    if (caseSnap && caseSnap.exists()) {
      caseData = caseSnap.data();
    } else {
      // Fallback: Check if client supplied case payload for newly created local records
      if (body.caseData && body.caseData.id === caseId) {
        caseData = body.caseData;
      }
    }

    if (!caseData) {
      return NextResponse.json(
        { success: false, error: "Case not found in Ministry records." },
        { status: 404 }
      );
    }

    // 4. Verify Ownership
    if (caseData.userId !== authUser.uid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Citizen does not own this case." },
        { status: 403 }
      );
    }

    // 5. Check If Already Processed (Idempotent)
    if (caseData.aiProcessed && caseData.finalDecision && caseData.department) {
      return NextResponse.json({
        success: true,
        case: caseData,
        cached: true,
      });
    }

    // 6. Build Controlled Gemini Prompt
    const gemini = getGeminiClient();

    const isCertificate = caseType === "certificate";
    const certRequestConcept =
      caseData.certificateRequest || caseData.certificateType || caseData.title || "Custom Bureaucratic Certificate";

    const systemInstruction = `You are the official AI administrative processor of the fictional Ministry of Useless Affairs (MUA).
You process citizen cases involving unnecessary incidents, minor inconveniences, bureaucratic confusion, and requests for custom certificates.
Use professional government terminology with subtle bureaucratic humor.
You MUST return valid JSON matching the supplied schema.

ALLOWED DEPARTMENTS (choose exactly one):
${ALLOWED_DEPARTMENTS.map((d) => `- "${d}"`).join("\n")}

ALLOWED STATUSES (choose exactly one):
${ALLOWED_STATUSES.map((s) => `- "${s}"`).join("\n")}

CRITICAL RULES FOR CERTIFICATE REQUESTS:
- The citizen can enter ANY custom, free-form certificate request they want.
- Do NOT compare the request against a fixed or predefined list of certificate types.
- Do NOT reject or question the request simply because it is not in a predefined category. The citizen's imagination is the sole source of the certificate topic.
- Understand the citizen's intent and generate appropriate mock-serious bureaucratic content.
- For certificate requests, always set status to "Approved" unless completely nonsensical or harmful.
- "certificateTitle": Synthesize a prestigious, official-sounding certificate title derived directly from the citizen's request (e.g., "Certificate of Academic Survival", "Certificate of Unnecessary Participation", "Certificate of Extreme Patience").
- "certificateValue": Synthesize a SHORT, prestigious-sounding, humorous, UPPERCASE awarded value (STRICTLY 15-40 CHARACTERS MAXIMUM) suitable for engraving directly onto an official certificate (e.g. "EXTRAORDINARY FOUR-YEAR SURVIVAL", "DISTINGUISHED MEETING ATTENDANCE", "OUTSTANDING USELESS ENDURANCE", "SUPREME BUREAUCRATIC COMPLIANCE"). Do NOT generate a sentence or long paragraph. Keep it concise so it fits the certificate design.
- "finalDecision": Write a 2-3 sentence mock-serious government decision statement explaining why the Ministry officially grants or recognizes this accomplishment.

Do not invent citizen identity information, citizen IDs, or case IDs.
Do not modify user identity, citizenship status, rank, or useless points.
Do not include markdown or text outside the JSON.`;

    const userPrompt = isCertificate
      ? `PROCESS THIS OFFICIAL CITIZEN CERTIFICATE REQUEST:
Case ID: ${caseId}
Citizen Name: ${caseData.citizenName || authUser.displayName || "Distinguished Citizen"}
Certificate Request: "${certRequestConcept}"
Purpose / Justification: "${caseData.purpose || "Official recognition requested."}"
Additional Notes: "${caseData.notes || "None"}"

Analyze the citizen's custom certificate concept, select the most amusingly fitting Department from the allowed list, approve the request, formulate a prestigious Certificate Title, a concise uppercase Certificate Value (max 40 chars), and a 2-3 sentence final bureaucratic decision.

Return JSON conforming strictly to:
{
  "department": "One of the allowed departments exactly",
  "status": "Approved",
  "finalDecision": "Concise official government decision statement",
  "certificateTitle": "Official certificate title (e.g. Certificate of Academic Survival)",
  "certificateValue": "SHORT UPPERCASE AWARDED VALUE (max 40 chars)"
}`
      : `PROCESS THIS OFFICIAL CITIZEN INCIDENT REPORT:
Case ID: ${caseId}
Citizen Name: ${caseData.citizenName || authUser.displayName || "Distinguished Citizen"}
Incident Title: ${caseData.title || "Untitled Case"}
Category: ${caseData.category || "General Bureaucratic Affair"}
Description: ${caseData.description || "No description provided."}
Severity: ${caseData.severity || "Moderate"}
Location: ${caseData.location || "General Vicinity"}

Return JSON conforming strictly to:
{
  "department": "One of the allowed departments exactly",
  "status": "One of the allowed statuses exactly",
  "finalDecision": "Concise official government decision statement",
  "certificateTitle": "Official certificate title",
  "certificateValue": "SHORT UPPERCASE AWARDED VALUE (max 40 chars)"
}`;

    // 7. Call Gemini
    const geminiResponse = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const responseText = geminiResponse.text || "";
    let parsed: AiResponseStructure;

    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      console.error("MUA AI — Failed to parse Gemini response:", responseText);
      throw new Error("Invalid structured JSON returned from Gemini.");
    }

    // 8. Validate & Sanitize Response
    let department = parsed.department?.trim();
    if (!ALLOWED_DEPARTMENTS.includes(department as any)) {
      department =
        caseType === "certificate"
          ? "Department of Bureaucratic Affairs"
          : "Department of Minor Inconveniences";
    }

    let status = parsed.status?.trim();
    if (!ALLOWED_STATUSES.includes(status as any)) {
      status = caseType === "certificate" ? "Approved" : "Under Review";
    }

    const finalDecision =
      parsed.finalDecision?.trim() ||
      "The Ministry has formally examined the trivialities presented and determined that bureaucratic procedures must proceed unimpeded.";

    const certificateTitle =
      parsed.certificateTitle?.trim() ||
      (caseType === "certificate"
        ? caseData.certificateRequest || caseData.certificateType || "Certificate of Bureaucratic Excellence"
        : "Certificate of Administrative Endurance");

    const certificateValue = (
      parsed.certificateValue?.trim() || "EXTRAORDINARY BUREAUCRATIC RECOGNITION"
    )
      .toUpperCase()
      .replace(/[\n\r]+/g, " ")
      .slice(0, 45);

    const updatedData = {
      ...caseData,
      certificateRequest: caseData.certificateRequest || caseData.certificateType || certRequestConcept,
      certificateType: caseData.certificateType || caseData.certificateRequest || certRequestConcept,
      department,
      status,
      finalDecision,
      certificateTitle,
      certificateValue,
      aiProcessed: true,
      aiProcessedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 9. Save to Firestore asynchronously
    try {
      await updateDoc(caseRef, {
        department,
        status,
        finalDecision,
        certificateTitle,
        certificateValue,
        aiProcessed: true,
        aiProcessedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
    } catch (saveErr) {
      console.warn("MUA AI — Could not update Firestore directly (saved locally):", saveErr);
    }

    // 10. Return Processed Case
    return NextResponse.json({
      success: true,
      case: updatedData,
    });
  } catch (error: any) {
    console.error("MUA Process Case Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "The Ministry's AI processing division is temporarily swamped with paperwork.",
        canRetry: true,
      },
      { status: 500 }
    );
  }
}
