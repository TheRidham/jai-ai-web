import { useState, useRef, useCallback } from 'react';

interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  finalDuration: number; // Store final duration after recording stops
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
}

export const useAudioRecorder = () => {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    finalDuration: 0,
    audioBlob: null,
    audioUrl: null,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create MediaRecorder with supported MIME type
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/mp4'; // Safari fallback
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setState((prev) => ({
          ...prev,
          audioBlob: blob,
          audioUrl: url,
          isRecording: false,
          isPaused: false,
        }));
      };

      // Start recording
      mediaRecorder.start();
      setState((prev) => ({ ...prev, isRecording: true, error: null }));

      // Start timer
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds++;
        setState((prev) => ({ ...prev, recordingTime: seconds }));
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to access microphone'
      }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();

      // Stop all audio tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Store final duration before resetting recordingTime
      const finalDuration = state.recordingTime;

      setState((prev) => ({
        ...prev,
        isRecording: false,
        recordingTime: 0,
        finalDuration,
      }));
    }
  }, [state.isRecording, state.recordingTime]);

  const resetRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }

    setState({
      isRecording: false,
      isPaused: false,
      recordingTime: 0,
      finalDuration: 0,
      audioBlob: null,
      audioUrl: null,
      error: null,
    });

    // Clear refs
    mediaRecorderRef.current = null;
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [state.audioUrl]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
  }, [state.audioUrl]);

  return {
    ...state,
    startRecording,
    stopRecording,
    resetRecording,
    cleanup,
  };
};
