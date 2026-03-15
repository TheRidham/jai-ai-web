"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2, Loader2 } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { transcribeAudio, formatRecordingTime } from "@/lib/transcribeAudio";

interface VoiceInputProps {
  onTranscriptReady: (text: string) => void;
  disabled?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onUIStateChange?: (isUIVisible: boolean) => void;
}

export default function VoiceInput({
  onTranscriptReady,
  disabled = false,
  onRecordingStart,
  onRecordingStop,
  onUIStateChange,
}: VoiceInputProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    isRecording,
    recordingTime,
    finalDuration,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    resetRecording,
    cleanup,
  } = useAudioRecorder();

  // Setup audio element for playback
  useEffect(() => {
    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  // Notify parent when voice UI becomes visible/hidden
  useEffect(() => {
    const isUIVisible = isRecording || audioUrl !== null || isTranscribing || transcriptionError !== null;
    onUIStateChange?.(isUIVisible);
  }, [isRecording, audioUrl, isTranscribing, transcriptionError, onUIStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const handleStartRecording = async () => {
    setTranscriptionError(null);
    onRecordingStart?.();
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
    onRecordingStop?.();
  };

  const handleDeleteRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    resetRecording();
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSendTranscript = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      const result = await transcribeAudio({
        audioBlob,
        fileName: `audio_${Date.now()}.webm`,
      });

      if (result.text) {
        onTranscriptReady(result.text);
        handleDeleteRecording();
      } else {
        setTranscriptionError(result.error || 'Failed to transcribe audio');
      }
    } catch (err) {
      setTranscriptionError('Failed to transcribe audio');
      console.error('Transcription error:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Show error state
  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-500 text-sm">
        <span>{error}</span>
        <button onClick={resetRecording} className="underline">
          Retry
        </button>
      </div>
    );
  }

  // Recording state
  if (isRecording) {
    return (
      <div className="flex items-center gap-3">
        {/* Stop button */}
        <button
          onClick={handleStopRecording}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
        >
          <Square size={16} fill="currentColor" />
          <span className="font-semibold">{formatRecordingTime(recordingTime)}</span>
        </button>
      </div>
    );
  }

  // Review state (after recording)
  if (audioUrl && audioBlob) {
    return (
      <div className="flex items-center gap-2">
        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          disabled={isTranscribing}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        {/* Duration */}
        <span className="text-sm text-gray-600 min-w-[50px]">
          {formatRecordingTime(finalDuration)}
        </span>

        {/* Delete button */}
        <button
          onClick={handleDeleteRecording}
          disabled={isTranscribing}
          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
          title="Delete recording"
        >
          <Trash2 size={18} />
        </button>

        {/* Send button */}
        <button
          onClick={handleSendTranscript}
          disabled={isTranscribing}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors disabled:opacity-50"
        >
          {isTranscribing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Transcribing...</span>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold">Send</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // Show transcription error
  if (transcriptionError) {
    return (
      <div className="flex items-center gap-2 text-red-500 text-sm">
        <span>{transcriptionError}</span>
        <button onClick={handleDeleteRecording} className="underline">
          Try again
        </button>
      </div>
    );
  }

  // Idle state (mic button)
  return (
    <button
      onClick={handleStartRecording}
      disabled={disabled}
      className="p-2 text-gray-500 hover:text-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Record voice message"
    >
      <Mic size={20} />
    </button>
  );
}
