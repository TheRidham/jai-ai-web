import { NextResponse } from "next/server";
import { elevenlabs, VOICE_ID, MODEL_TTS } from "@/lib/elevenlabs-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, voiceId, voiceSettings } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    const ttsOptions: Record<string, unknown> = {
      text,
      modelId: MODEL_TTS,
      outputFormat: "mp3_44100_128",
    };

    if (voiceSettings) {
      const voiceSettingsObj: Record<string, unknown> = {};
      if (voiceSettings.stability !== undefined) {
        voiceSettingsObj.stability = voiceSettings.stability;
      }
      if (voiceSettings.similarityBoost !== undefined) {
        voiceSettingsObj.similarityBoost = voiceSettings.similarityBoost;
      }
      if (voiceSettings.speed !== undefined) {
        voiceSettingsObj.speed = voiceSettings.speed;
      }
      if (voiceSettings.style !== undefined) {
        voiceSettingsObj.style = voiceSettings.style;
      }
      if (voiceSettings.useSpeakerBoost !== undefined) {
        voiceSettingsObj.useSpeakerBoost = voiceSettings.useSpeakerBoost;
      }
      if (Object.keys(voiceSettingsObj).length > 0) {
        ttsOptions.voiceSettings = voiceSettingsObj;
      }
    }

    const response = await (elevenlabs as unknown as { textToSpeech: { convert: (voiceId: string, options: Record<string, unknown>) => Promise<unknown> } }).textToSpeech.convert(
      voiceId || VOICE_ID,
      ttsOptions
    );

    return new Response(response as unknown as ReadableStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[TTS] Error:", error);
    return NextResponse.json(
      { error: "TTS generation failed" },
      { status: 500 }
    );
  }
}
