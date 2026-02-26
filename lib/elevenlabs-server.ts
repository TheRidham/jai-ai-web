import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
export const MODEL_TTS = "eleven_flash_v2_5";
export const MODEL_SCRIBE = "scribe_v2_realtime";
