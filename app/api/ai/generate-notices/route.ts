import { NextResponse } from "next/server";
import { getOrGenerateNotices } from "@/lib/notice-service";

export async function POST() {
  try {
    const result = await getOrGenerateNotices();
    return NextResponse.json({
      success: true,
      count: result.notices.length,
      generatedFresh: result.generatedFresh,
      notices: result.notices,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Autonomous notice generation failed",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
