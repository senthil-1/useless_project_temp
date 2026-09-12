import { NextResponse } from "next/server";
import { getOrGenerateNotices } from "@/lib/notice-service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";
    const result = await getOrGenerateNotices(force);

    return NextResponse.json({
      success: true,
      count: result.notices.length,
      generatedFresh: result.generatedFresh,
      notices: result.notices,
    });
  } catch (error: any) {
    console.error("MUA Notices API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "The Ministry's Notice Board is currently undergoing routine procedural maintenance.",
      },
      { status: 500 }
    );
  }
}
