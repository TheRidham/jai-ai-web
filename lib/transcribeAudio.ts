import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { functions, storage } from '@/lib/firebase';

interface TranscribeAudioOptions {
  audioBlob: Blob;
  fileName?: string;
}

interface TranscribeAudioResult {
  text: string | null;
  error?: string;
}

/**
 * Upload audio to Firebase Storage and transcribe using OpenAI Whisper
 */
export async function transcribeAudio({
  audioBlob,
  fileName = `audio_${Date.now()}.webm`,
}: TranscribeAudioOptions): Promise<TranscribeAudioResult> {
  try {
    console.log('[TRANSCRIBE] Uploading audio to Firebase Storage...');

    // Upload to Firebase Storage
    const storageRef = ref(storage, `audio_files/${fileName}`);
    await uploadBytes(storageRef, audioBlob);
    const audioUrl = await getDownloadURL(storageRef);

    console.log('[TRANSCRIBE] Audio uploaded, calling transcribeAudio function...');

    // Call the transcribeAudio cloud function (same as Android app)
    const transcribeFn = httpsCallable(functions, 'transcribeAudio');
    const result = await transcribeFn({ audioUrl });

    console.log('[TRANSCRIBE] Transcription complete');

    // The result structure depends on your cloud function
    const data = result.data as { text?: string; transcription?: string };

    return {
      text: data.text || data.transcription || null,
    };
  } catch (error) {
    console.error('[TRANSCRIBE] Error:', error);
    return {
      text: null,
      error: error instanceof Error ? error.message : 'Failed to transcribe audio',
    };
  }
}

/**
 * Format recording time as MM:SS
 */
export function formatRecordingTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
