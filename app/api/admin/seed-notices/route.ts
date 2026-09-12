import { NextResponse } from "next/server";
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getOrGenerateNotices } from "@/lib/notice-service";
import { verifyAuthToken } from "@/lib/server-auth";

const ADMIN_SECRET = "MUA-OFFICIAL-ADMIN-SECRET-2026";

export async function POST(req: Request) {
  try {
    // 1. Verify user is authenticated or has admin secret
    const authUser = await verifyAuthToken(req);
    const authHeader = req.headers.get("x-admin-key");

    if (!authUser && authHeader !== ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Official Ministry Administrative Credentials Required." },
        { status: 401 }
      );
    }

    // Generate fresh AI notices
    const result = await getOrGenerateNotices(true);

    return NextResponse.json({
      success: true,
      seededCount: result.notices.length,
      generatedFresh: result.generatedFresh,
      notices: result.notices,
    });
  } catch (error: any) {
    console.error("MUA Seed Notices Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error during seeding" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const snap = await getDocs(collection(db, "notices"));
    return NextResponse.json({
      success: true,
      count: snap.size,
      notices: snap.docs.map((d) => d.data()),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
