import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { verifyAuthToken } from "@/lib/server-auth";
import { getCertificateFonts, renderTextToSvgPath } from "@/lib/certificate-font";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get("caseId");
    const caseType = searchParams.get("caseType") || "certificate";

    if (!caseId) {
      return new NextResponse("Missing caseId parameter", { status: 400 });
    }

    // 1. Verify Authentication
    const authUser = await verifyAuthToken(req);
    if (!authUser) {
      return new NextResponse("Unauthorized. Please provide a valid citizen token.", {
        status: 401,
      });
    }

    // 2. Fetch case from Firestore or fallback query params
    const collectionName = caseType === "incident" ? "incidents" : "certificateRequests";
    let caseData: any = null;

    try {
      const snap = await getDoc(doc(db, collectionName, caseId));
      if (snap.exists()) {
        caseData = snap.data();
      }
    } catch (e) {
      console.warn("Could not read case from Firestore for certificate:", e);
    }

    // If not found in primary collection, try alternate collection
    if (!caseData) {
      const altCollection = caseType === "incident" ? "certificateRequests" : "incidents";
      try {
        const altSnap = await getDoc(doc(db, altCollection, caseId));
        if (altSnap.exists()) {
          caseData = altSnap.data();
        }
      } catch {}
    }

    // Allow user-owned fallback params if Firestore is offline
    const clientName = searchParams.get("citizenName");
    const clientVal = searchParams.get("certificateValue");

    const citizenName =
      caseData?.citizenName ||
      clientName ||
      authUser.displayName ||
      "Distinguished Citizen";

    const rawValue =
      caseData?.certificateValue ||
      clientVal ||
      caseData?.certificateTitle ||
      caseData?.certificateRequest ||
      caseData?.certificateType ||
      "EXTRAORDINARY BUREAUCRATIC EXCELLENCE";

    const certificateValue = rawValue.toUpperCase();

    const createdDate = caseData?.createdAt?.toDate
      ? caseData.createdAt.toDate()
      : caseData?.createdAt
      ? new Date(caseData.createdAt)
      : new Date();

    const formattedDate = createdDate
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .toUpperCase();

    // 3. Dynamic Font Sizing & Vector Path Generation using Bundled Font
    const fonts = getCertificateFonts();

    let initialNameSize = 38;
    if (citizenName.length > 35) initialNameSize = 24;
    else if (citizenName.length > 25) initialNameSize = 30;
    else if (citizenName.length > 18) initialNameSize = 34;

    let initialValSize = 26;
    if (certificateValue.length > 45) initialValSize = 17;
    else if (certificateValue.length > 35) initialValSize = 20;
    else if (certificateValue.length > 25) initialValSize = 23;

    // 1. Citizen Name: centered at X=768, baseline Y=488
    const nameResult = renderTextToSvgPath({
      font: fonts.italic,
      text: citizenName,
      x: 768,
      y: 488,
      initialFontSize: initialNameSize,
      alignment: "center",
      maxWidth: 820,
      minFontSize: 18,
    });

    // 2. Certificate Value: centered at X=768, baseline Y=597
    const valResult = renderTextToSvgPath({
      font: fonts.bold,
      text: certificateValue,
      x: 768,
      y: 597,
      initialFontSize: initialValSize,
      alignment: "center",
      maxWidth: 820,
      minFontSize: 14,
    });

    // 3. Official Date: directly on the "DATE :" line at X=1215, baseline Y=926
    const dateResult = renderTextToSvgPath({
      font: fonts.bold,
      text: formattedDate,
      x: 1215,
      y: 926,
      initialFontSize: 17,
      alignment: "left",
      maxWidth: 220,
      minFontSize: 12,
    });

    // 4. Case Identifier: discreet top right corner at X=1450, baseline Y=55
    const caseResult = renderTextToSvgPath({
      font: fonts.regular,
      text: caseId,
      x: 1450,
      y: 55,
      initialFontSize: 12,
      alignment: "right",
      maxWidth: 300,
      minFontSize: 10,
    });

    // 4. Construct SVG Overlay with pure vector paths (independent of OS fonts)
    const svgOverlay = `
      <svg width="1536" height="1024" xmlns="http://www.w3.org/2000/svg">
        <!-- Citizen Name: between "THIS IS TO CERTIFY THAT" and "HAS BEEN AWARDED THE" -->
        <path d="${nameResult.d}" fill="#172235" />

        <!-- Certificate Value: between "HAS BEEN AWARDED THE" and appreciation paragraph -->
        <path d="${valResult.d}" fill="#9b1c31" />

        <!-- Official Date: directly in the "DATE :" line area -->
        <path d="${dateResult.d}" fill="#172235" />

        <!-- Case Identifier: discreet top right corner -->
        <path d="${caseResult.d}" fill="#687386" />
      </svg>
    `;

    // 5. Load Template and Overlay with Sharp
    const templatePath = path.join(process.cwd(), "public", "certificate-template.png");
    const templateBuffer = await fs.readFile(templatePath);

    const certificatePng = await sharp(templateBuffer)
      .composite([
        {
          input: Buffer.from(svgOverlay),
          top: 0,
          left: 0,
        },
      ])
      .png({ quality: 100 })
      .toBuffer();

    return new NextResponse(certificatePng, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="MUA-Certificate-${caseId}.png"`,
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch (error: any) {
    console.error("Certificate Generation Error:", error);
    return new NextResponse(
      `Failed to generate official certificate: ${error?.message || error}`,
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Support POST with JSON body as well
  try {
    const body = await req.json().catch(() => ({}));
    const caseId = body.caseId;
    const caseType = body.caseType || "certificate";

    if (!caseId) {
      return NextResponse.json({ error: "Missing caseId" }, { status: 400 });
    }

    const url = new URL(req.url);
    url.searchParams.set("caseId", caseId);
    url.searchParams.set("caseType", caseType);
    if (body.token) url.searchParams.set("token", body.token);

    return GET(new NextRequest(url.toString(), { headers: req.headers }));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
