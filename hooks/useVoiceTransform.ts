"use client";

import { useCallback, useRef, useState } from "react";
import { Scribe, RealtimeEvents, CommitStrategy, AudioFormat } from "@elevenlabs/client";
import type {
  VoiceTransformStatus,
  Transcript,
  VoiceTransformConfig,
  UseVoiceTransformReturn,
  UseVoiceTransformOptions,
} from "@/types/voice-transform";

const DEFAULT_COMMIT_CONFIG = {
  silenceAfterPunctuationMs: 400,
  maxSilenceMs: 2500,
  maxWordsBeforeCommit: 20,
  punctuationMarks: [".", "?", "!", "。", "।"],
};

function getSupportedSampleRate(actualRate: number): { format: AudioFormat; rate: number } {
  const supportedRates = [
    { format: AudioFormat.PCM_48000, rate: 48000 },
    { format: AudioFormat.PCM_44100, rate: 44100 },
    { format: AudioFormat.PCM_24000, rate: 24000 },
    { format: AudioFormat.PCM_22050, rate: 22050 },
    { format: AudioFormat.PCM_16000, rate: 16000 },
    { format: AudioFormat.PCM_8000, rate: 8000 },
  ];
  
  const closest = supportedRates.reduce((prev, curr) => 
    Math.abs(curr.rate - actualRate) < Math.abs(prev.rate - actualRate) ? curr : prev
  );
  
  return closest;
}

export function useVoiceTransform(
  config?: VoiceTransformConfig,
  options?: UseVoiceTransformOptions,
): UseVoiceTransformReturn {
  const [state, setState] = useState({
    status: "idle" as VoiceTransformStatus,
    partialTranscript: "",
    committedTranscripts: [] as Transcript[],
    error: null as string | null,
  });
  const [transformedStream, setTransformedStream] = useState<MediaStream | null>(null);

  const commitConfig = {
    ...DEFAULT_COMMIT_CONFIG,
    maxWordsBeforeCommit: options?.maxWordsBeforeCommit ?? DEFAULT_COMMIT_CONFIG.maxWordsBeforeCommit,
  };

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scribeConnectionRef = useRef<ReturnType<typeof Scribe.connect> | null>(null);
  const isStoppingRef = useRef(false);
  const commitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPartialRef = useRef<string>("");
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const isExternalStreamRef = useRef(false);
  const isSessionReadyRef = useRef(false);

  const setStatus = useCallback((status: VoiceTransformStatus) => {
    setState((prev) => ({ ...prev, status }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error, status: error ? "error" : prev.status }));
  }, []);

  const playTTSToStream = useCallback(async (text: string) => {
    if (!audioContextRef.current || !text.trim()) return;

    try {
      const voiceSettings = config?.voiceSettings;
      const body: {
        text: string;
        voiceId?: string;
        voiceSettings?: {
          stability?: number;
          similarityBoost?: number;
          speed?: number;
          style?: number;
          useSpeakerBoost?: boolean;
        };
      } = { text };

      if (config?.voiceId) {
        body.voiceId = config.voiceId;
      }
      if (voiceSettings) {
        body.voiceSettings = voiceSettings;
      }

      const response = await fetch("/api/elevenlabs/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error("[TTS] Request failed:", response.status);
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      if (audioContextRef.current && mediaStreamDestinationRef.current) {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(mediaStreamDestinationRef.current);
        source.start(0);
        console.log("[TTS] Playing transformed audio to stream");
      }
    } catch (error) {
      console.error("[TTS] Error:", error);
    }
  }, [config]);

  const clearCommitTimer = useCallback(() => {
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
  }, []);

  const forceCommit = useCallback(() => {
    clearCommitTimer();

    if (scribeConnectionRef.current && lastPartialRef.current.trim()) {
      console.log("[COMMIT] Forcing commit for:", lastPartialRef.current);
      scribeConnectionRef.current.commit();
    }
  }, [clearCommitTimer]);

  const endsWithPunctuation = useCallback((text: string): boolean => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return false;
    const lastChar = trimmed[trimmed.length - 1];
    return commitConfig.punctuationMarks.includes(lastChar);
  }, [commitConfig]);

  const getWordCount = useCallback((text: string): number => {
    return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }, []);

  const handlePartialTranscript = useCallback((text: string) => {
    lastPartialRef.current = text;
    setState((prev) => ({ ...prev, partialTranscript: text }));

    if (!text.trim()) return;

    clearCommitTimer();

    commitTimerRef.current = setTimeout(() => {
      forceCommit();
    }, commitConfig.maxSilenceMs);

    if (endsWithPunctuation(text)) {
      const wordCount = getWordCount(text);
      if (wordCount >= 3) {
        clearCommitTimer();
        setTimeout(() => forceCommit(), commitConfig.silenceAfterPunctuationMs);
        return;
      }
    }

    if (getWordCount(text) >= commitConfig.maxWordsBeforeCommit) {
      clearCommitTimer();
      setTimeout(() => forceCommit(), 300);
      return;
    }
  }, [clearCommitTimer, forceCommit, endsWithPunctuation, getWordCount, commitConfig]);

  const float32ToPCM16 = useCallback((float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }, []);

  const arrayBufferToBase64 = useCallback((buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }, []);

  const resampleAudio = useCallback((
    input: Float32Array,
    inputSampleRate: number,
    outputSampleRate: number
  ): Float32Array => {
    if (inputSampleRate === outputSampleRate) return input;
    
    const ratio = inputSampleRate / outputSampleRate;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Float32Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const srcIndex = Math.floor(i * ratio);
      output[i] = input[srcIndex];
    }
    
    return output;
  }, []);

  const start = useCallback(async (externalStream?: MediaStream) => {
    isStoppingRef.current = false;
    isSessionReadyRef.current = false;
    lastPartialRef.current = "";
    setError(null);

    const hasExternalStream = !!externalStream;
    isExternalStreamRef.current = hasExternalStream;

    if (!hasExternalStream) {
      setStatus("requesting-mic");
    } else {
      setStatus("connecting");
    }

    try {
      let stream: MediaStream;

      if (externalStream) {
        stream = externalStream;
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
            channelCount: 1,
          },
        });
      }
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Create MediaStreamDestination for transformed audio
      const destination = audioContext.createMediaStreamDestination();
      mediaStreamDestinationRef.current = destination;
      setTransformedStream(destination.stream);

      setStatus("connecting");

      const tokenResponse = await fetch("/api/elevenlabs/scribe-token", {
        method: "POST",
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to get token");
      }

      const { token } = await tokenResponse.json();

      let connection: ReturnType<typeof Scribe.connect>;
      let targetSampleRate = 16000;
      let audioFormat = AudioFormat.PCM_16000;

      if (hasExternalStream) {
        const actualSampleRate = audioContext.sampleRate;
        const supported = getSupportedSampleRate(actualSampleRate);
        targetSampleRate = supported.rate;
        audioFormat = supported.format;
        
        console.log(`[SCRIBE] Using sample rate ${targetSampleRate} (actual: ${actualSampleRate})`);
        
        connection = Scribe.connect({
          token,
          modelId: "scribe_v2_realtime",
          commitStrategy: CommitStrategy.MANUAL,
          audioFormat,
          sampleRate: targetSampleRate,
        });
      } else {
        connection = Scribe.connect({
          token,
          modelId: "scribe_v2_realtime",
          commitStrategy: CommitStrategy.MANUAL,
          microphone: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      scribeConnectionRef.current = connection;

      connection.on(RealtimeEvents.OPEN, () => {
        console.log("[SCRIBE] WebSocket opened");
      });

      connection.on(RealtimeEvents.SESSION_STARTED, () => {
        console.log("[SCRIBE] Session started");
        isSessionReadyRef.current = true;
        setStatus("listening");
        
        if (hasExternalStream) {
          const source = audioContext.createMediaStreamSource(stream);
          mediaStreamSourceRef.current = source;

          const bufferSize = 4096;
          const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
          source.connect(scriptProcessor);
          
          scriptProcessorRef.current = scriptProcessor;

          scriptProcessor.onaudioprocess = (event) => {
            if (isStoppingRef.current || !scribeConnectionRef.current || !isSessionReadyRef.current) return;

            let inputData: Float32Array = event.inputBuffer.getChannelData(0);
            
            if (audioContext.sampleRate !== targetSampleRate) {
              const resampled = resampleAudio(inputData, audioContext.sampleRate, targetSampleRate);
              inputData = new Float32Array(resampled);
            }
            
            const pcm16 = float32ToPCM16(inputData);
            const base64 = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);

            try {
              scribeConnectionRef.current.send({ audioBase64: base64 });
            } catch (e) {
              console.error("[SCRIPT_PROCESSOR] Error sending audio:", e);
            }
          };
          
          console.log("[SCRIBE] Audio processing started");
        }
      });

      connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data: { text: string }) => {
        handlePartialTranscript(data.text || "");
      });

      connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data: { text: string }) => {
        console.log("[SCRIBE] Committed:", data.text);
        clearCommitTimer();
        lastPartialRef.current = "";

        const text = data.text || "";
        if (text.trim()) {
          const transcript: Transcript = {
            id: `t-${Date.now()}`,
            text,
            timestamp: Date.now(),
          };
          setState((prev) => ({
            ...prev,
            partialTranscript: "",
            committedTranscripts: [...prev.committedTranscripts, transcript],
          }));
          if (options?.autoPlay !== false) {
            playTTSToStream(text);
          }
        }
      });

      connection.on(RealtimeEvents.ERROR, (error: unknown) => {
        if (isStoppingRef.current) return;
        
        console.error("[SCRIBE] Error:", error);
        setError("Transcription error. Please try again.");
      });

      connection.on(RealtimeEvents.AUTH_ERROR, (error: unknown) => {
        if (isStoppingRef.current) return;
        
        console.error("[SCRIBE] Auth Error:", error);
        setError("Authentication error. Please try again.");
      });

      connection.on(RealtimeEvents.CLOSE, () => {
        console.log("[SCRIBE] Connection closed");
        scribeConnectionRef.current = null;
        clearCommitTimer();

        if (!isStoppingRef.current) {
          setError("Connection lost. Please try again.");
        }
      });

    } catch (error) {
      console.error("[START] Error:", error);
      if (error instanceof Error && error.name === "NotAllowedError") {
        setError("Microphone access denied. Please allow microphone access.");
      } else {
        setError("Failed to start. Please try again.");
      }
    }
  }, [config, options?.autoPlay, setError, setStatus, handlePartialTranscript, clearCommitTimer, playTTSToStream, float32ToPCM16, arrayBufferToBase64, resampleAudio]);

  const stop = useCallback(() => {
    isStoppingRef.current = true;
    isSessionReadyRef.current = false;
    clearCommitTimer();

    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {}
      scriptProcessorRef.current = null;
    }

    if (mediaStreamSourceRef.current) {
      try {
        mediaStreamSourceRef.current.disconnect();
      } catch {}
      mediaStreamSourceRef.current = null;
    }

    if (mediaStreamDestinationRef.current) {
      try {
        mediaStreamDestinationRef.current.disconnect();
      } catch {}
      mediaStreamDestinationRef.current = null;
    }

    if (scribeConnectionRef.current) {
      scribeConnectionRef.current.close();
      scribeConnectionRef.current = null;
    }

    if (!isExternalStreamRef.current && streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    lastPartialRef.current = "";
    isExternalStreamRef.current = false;
    setTransformedStream(null);

    setState({
      status: "idle",
      partialTranscript: "",
      committedTranscripts: [],
      error: null,
    });
  }, [clearCommitTimer]);

  return {
    ...state,
    start,
    stop,
    transformedStream,
  };
}
