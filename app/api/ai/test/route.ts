import { NextResponse } from "next/server";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";

export async function POST() {
    try {
        console.log("=================================");
        console.log("MUA GEMINI TEST");
        console.log("Model:", GEMINI_MODEL);
        console.log(
            "API key exists:",
            Boolean(process.env.GEMINI_API_KEY)
        );
        console.log("=================================");

        const gemini = getGeminiClient();

        const response = await gemini.models.generateContent({
            model: GEMINI_MODEL,
            contents:
                "Say exactly: The Ministry has unnecessarily received your request.",
        });

        console.log("Gemini response:", response.text);

        return NextResponse.json({
            success: true,
            model: GEMINI_MODEL,
            response: response.text,
        });
    } catch (error: unknown) {
        console.error("=================================");
        console.error("MUA GEMINI ERROR");
        console.error(error);
        console.error("=================================");

        const message =
            error instanceof Error
                ? error.message
                : String(error);

        return NextResponse.json(
            {
                success: false,
                error: message,
            },
            { status: 500 }
        );
    }
}