import { NextResponse } from "next/server";
import { elevenlabs } from "@/lib/elevenlabs-server";

export async function GET() {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    const response = await (elevenlabs as unknown as { voices: { getAll: () => Promise<unknown> } }).voices.getAll();
    return NextResponse.json(response);
  } catch (error) {
    console.error("[VOICES] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch voices" },
      { status: 500 }
    );
  }
}
