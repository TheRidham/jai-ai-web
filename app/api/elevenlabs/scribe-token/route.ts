import { NextResponse } from "next/server";
import { elevenlabs } from "@/lib/elevenlabs-server";

export async function POST() {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    const token = await elevenlabs.tokens.singleUse.create("realtime_scribe");
    
    return NextResponse.json({
      token: token.token,
      expiresIn: 900,
    });
  } catch (error) {
    console.error("[SCRIBE-TOKEN] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
