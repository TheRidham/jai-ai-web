"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useVideoRoom } from "@/hooks/useVideoRoom";
import { useVoiceTransform } from "@/hooks/useVoiceTransform";
import { onAuthStateChanged } from "firebase/auth";
import { auth, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import AIChatPanel from "@/components/AIChatPanel";
import type { VoiceOption } from "@/types/voice-transform";
import { LocalAudioTrack } from "twilio-video";

export default function VideoCallPage() {
    const router = useRouter();
    const { roomId } = useParams() as { roomId: string };
    const [authReady, setAuthReady] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);
    const [isChatCollapsed, setIsChatCollapsed] = useState(false);
    
    const [voices, setVoices] = useState<VoiceOption[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<string>("");
    const [stability, setStability] = useState<number>(0.5);
    const [similarityBoost, setSimilarityBoost] = useState<number>(0.75);
    const [speed, setSpeed] = useState<number>(1.0);
    const [voiceTransformEnabled, setVoiceTransformEnabled] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [transformedTrackPublished, setTransformedTrackPublished] = useState(false);

    const {
        joinRoom,
        leaveRoom,
        localVideoRef,
        remoteVideoRef,
        toggleCamera,
        toggleMic,
        cameraEnabled,
        micEnabled,
        status,
        connecting,
        error,
        roomRef,
        localAudioTrackRef,
    } = useVideoRoom({ roomId });

    const voiceSettings = {
        stability,
        similarityBoost,
        speed,
    };

    const {
        status: voiceTransformStatus,
        partialTranscript,
        committedTranscripts,
        error: voiceTransformError,
        start: startVoiceTransform,
        stop: stopVoiceTransform,
        transformedStream,
    } = useVoiceTransform(
        {
            voiceId: selectedVoice || undefined,
            voiceSettings,
        },
        { autoPlay: true }
    );

    useEffect(() => {
        const fetchVoices = async () => {
            try {
                const response = await fetch("/api/elevenlabs/voices");
                if (response.ok) {
                    const data = await response.json();

                    const voicesArray = (data.voices || []).map((v: { voiceId: string; name: string; category?: string; description?: string; labels?: string[] }) => ({
                        voice_id: v.voiceId,
                        name: v.name,
                        category: v.category,
                        description: v.description,
                        labels: v.labels,
                    }));

                    setVoices(voicesArray);

                    if (!selectedVoice && voicesArray.length > 0 && voicesArray[0].voice_id) {
                        setSelectedVoice(voicesArray[0].voice_id);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch voices:", err);
            }
        };
        fetchVoices();
    }, [selectedVoice]);

    const handleVoiceTransformToggle = useCallback(() => {
        if (voiceTransformEnabled) {
            stopVoiceTransform();
            
            // Unpublish transformed track
            if (roomRef.current) {
                roomRef.current.localParticipant.audioTracks.forEach((pub) => {
                    if (pub.track.name === "transformed-audio") {
                        roomRef.current?.localParticipant.unpublishTrack(pub.track);
                        console.log("[VOICE] Unpublished transformed track");
                    }
                });

                // Unmute the original audio track
                if (localAudioTrackRef.current) {
                    localAudioTrackRef.current.enable(true);
                    console.log("[VOICE] Unmuted original track");
                }
            }
            setVoiceTransformEnabled(false);
            setTransformedTrackPublished(false);
        } else {
            if (status === "active" || status === "waiting") {
                // Start voice transform to get the stream
                startVoiceTransform();
                setVoiceTransformEnabled(true);
            }
        }
    }, [voiceTransformEnabled, status, startVoiceTransform, stopVoiceTransform, roomRef, localAudioTrackRef]);

    useEffect(() => {
        return () => {
            stopVoiceTransform();
        };
    }, [stopVoiceTransform]);

    useEffect(() => {
        // Publish transformed track when it becomes available (only once)
        if (voiceTransformEnabled && transformedStream && roomRef.current && !transformedTrackPublished) {
            const audioTrack = transformedStream.getAudioTracks()[0];
            if (audioTrack) {
                const transformedTrack = new LocalAudioTrack(audioTrack, { name: "transformed-audio" });
                roomRef.current.localParticipant.publishTrack(transformedTrack);
                setTransformedTrackPublished(true);
                
                // Mute the original audio track
                if (localAudioTrackRef.current) {
                    localAudioTrackRef.current.enable(false);
                    console.log("[VOICE] Muted original track");
                }
                
                console.log("[VOICE] Published transformed track to Twilio");
            }
        }
        
        // Reset flag when voice transform is disabled
        if (!voiceTransformEnabled) {
            setTransformedTrackPublished(false);
        }
    }, [voiceTransformEnabled, transformedStream, roomRef, transformedTrackPublished, localAudioTrackRef]);

    const handlePreset = (preset: "natural" | "expressive" | "fast" | "serious") => {
        switch (preset) {
            case "natural":
                setStability(0.5);
                setSimilarityBoost(0.75);
                setSpeed(1.0);
                break;
            case "expressive":
                setStability(0.3);
                setSimilarityBoost(0.75);
                setSpeed(0.9);
                break;
            case "fast":
                setStability(0.5);
                setSimilarityBoost(0.75);
                setSpeed(1.1);
                break;
            case "serious":
                setStability(0.7);
                setSimilarityBoost(0.8);
                setSpeed(1.0);
                break;
        }
    };

    const getVoiceTransformStatusColor = () => {
        switch (voiceTransformStatus) {
            case "listening":
                return "bg-green-500";
            case "connecting":
            case "requesting-mic":
                return "bg-yellow-500";
            case "error":
                return "bg-red-500";
            default:
                return "bg-gray-500";
        }
    };

    const getVoiceTransformStatusText = () => {
        switch (voiceTransformStatus) {
            case "requesting-mic":
                return "Requesting microphone...";
            case "connecting":
                return "Connecting...";
            case "listening":
                return "Listening";
            case "error":
                return "Error";
            default:
                return "Idle";
        }
    };

    const handleLeave = async () => {
        try {
            stopVoiceTransform();
            const leaveVideoRoom = httpsCallable(functions, "leaveVideoRoom");
            const res = await leaveVideoRoom({ roomId });
            const data = res.data as { success?: boolean };
            if (data?.success !== true) {
                throw new Error("Failed to leave room");
            } else {
                console.log("room is leaved!");
            }
        } catch (error) {
            console.error("Error leaving room:", error);
        }

        leaveRoom();
        router.push("/advisor/dashboard");
    };

    // Wait for auth to be ready
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, () => {
            setAuthReady(true);
        });
        return unsubscribe;
    }, []);

    // Join room once auth is ready
    useEffect(() => {
        if (authReady && !hasJoined) {
            joinRoom();
            setHasJoined(true);
        }

        // Cleanup on unmount - notify server user is leaving
        return () => {
            const cleanup = async () => {
                try {
                    const leaveVideoRoom = httpsCallable(functions, "leaveVideoRoom");
                    const res = await leaveVideoRoom({ roomId });
                    const data = res.data as { success?: boolean };
                    if (data?.success !== true) {
                        throw new Error("Failed to leave room");
                    } else {
                        console.log("room is leaved!");
                    }
                } catch (error) {
                    console.error("Error leaving room on unmount:", error);
                }
            };
            cleanup();
        };
    }, [authReady, hasJoined, joinRoom, roomId]);

    const getStatusColor = () => {
        switch (status) {
            case "waiting":
                return "text-yellow-600 bg-yellow-100";
            case "connecting":
                return "text-blue-600 bg-blue-100";
            case "active":
                return "text-green-600 bg-green-100";
            case "ended":
                return "text-red-600 bg-red-100";
            default:
                return "";
        }
    };

    // Show loading while auth is initializing
    if (!authReady) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-gray-600 font-semibold">Initializing...</p>
                </div>
            </div>
        );
    }

    return (
        <>
        <div className={`flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 max-w-7xl mx-auto min-h-screen transition-all duration-300 ${isChatCollapsed ? '' : 'lg:pr-[420px]'}`}>
            <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Room: {roomId}</h2>
                <p className="text-gray-600">
                    Status:{" "}
                    <span className={`px-3 py-1 rounded font-semibold ${getStatusColor()}`}>
                        {status}
                    </span>
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg font-medium">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1">
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2 bg-gray-100 rounded-lg overflow-hidden relative">
                            <h3 className="text-base sm:text-lg font-semibold px-3 sm:px-4 py-2 sm:py-3 bg-gray-200">You (Advisor)</h3>
                            <div
                                className="relative flex-1 min-h-60 sm:min-h-80 bg-black flex items-center justify-center overflow-hidden"
                                ref={localVideoRef}
                                suppressHydrationWarning
                            />
                            {connecting && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none">
                                    <div className="white text-center">
                                        <div className="animate-spin mb-2">⏳</div>
                                        <p>Connecting...</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 bg-gray-100 rounded-lg overflow-hidden relative">
                            <h3 className="text-base sm:text-lg font-semibold px-3 sm:px-4 py-2 sm:py-3 bg-gray-200">
                                Other Person
                            </h3>
                            <div
                                className="relative flex-1 min-h-60 sm:min-h-80 bg-black flex items-center justify-center overflow-hidden"
                                ref={remoteVideoRef}
                                suppressHydrationWarning
                            />
                            {status === "waiting" && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none">
                                    <p className="white font-semibold text-center">
                                        Waiting for other participant...
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 sm:gap-3 justify-center flex-wrap">
                        <button
                            onClick={toggleCamera}
                            disabled={connecting}
                            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base ${cameraEnabled
                                ? "bg-green-500 hover:bg-green-600 text-white"
                                : "bg-red-500 hover:bg-red-600 text-white"
                                }`}
                        >
                            <span className="hidden sm:inline">{cameraEnabled ? "📹 Camera On" : "📹 Camera Off"}</span>
                            <span className="sm:hidden">{cameraEnabled ? "📹" : "📹✕"}</span>
                        </button>
                        <button
                            onClick={toggleMic}
                            disabled={connecting || voiceTransformEnabled}
                            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base ${micEnabled
                                ? "bg-green-500 hover:bg-green-600 text-white"
                                : "bg-red-500 hover:bg-red-600 text-white"
                                }`}
                        >
                            <span className="hidden sm:inline">{micEnabled ? "🎤 Unmuted" : "🎤 Muted"}</span>
                            <span className="sm:hidden">{micEnabled ? "🎤" : "🎤✕"}</span>
                        </button>
                        <button
                            onClick={handleVoiceTransformToggle}
                            disabled={connecting}
                            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base ${voiceTransformEnabled
                                ? "bg-purple-500 hover:bg-purple-600 text-white"
                                : "bg-gray-500 hover:bg-gray-600 text-white"
                                }`}
                        >
                            <span className="hidden sm:inline">{voiceTransformEnabled ? "🎙️ Voice Transform ON" : "🎙️ Voice Transform"}</span>
                            <span className="sm:hidden">{voiceTransformEnabled ? "🎙️" : "🎙️"}</span>
                        </button>
                        <button
                            onClick={handleLeave}
                            disabled={connecting}
                            className="px-4 sm:px-6 py-2 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base"
                        >
                            <span className="hidden sm:inline">🚪 Leave Call</span>
                            <span className="sm:hidden">🚪</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="bg-gray-800 rounded-lg p-4 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Voice Transform Settings</h2>
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="text-sm text-gray-400 hover:text-white"
                            >
                                {showSettings ? "Hide" : "Show"}
                            </button>
                        </div>

                        {voiceTransformError && (
                            <div className="bg-red-900/50 border border-red-700 text-red-200 px-3 py-2 rounded-lg mb-4 text-sm">
                                {voiceTransformError}
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-3 h-3 rounded-full ${getVoiceTransformStatusColor()}`} />
                            <span className="text-sm font-medium text-gray-300">{getVoiceTransformStatusText()}</span>
                        </div>

                        {showSettings && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Voice
                                    </label>
                                    <select
                                        value={selectedVoice}
                                        onChange={(e) => setSelectedVoice(e.target.value)}
                                        disabled={voiceTransformEnabled}
                                        className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                                    >
                                        {voices.map((voice) => (
                                            <option key={voice.voice_id || voice.name} value={voice.voice_id}>
                                                {voice.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Stability: {stability.toFixed(2)}
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={stability}
                                        onChange={(e) => setStability(parseFloat(e.target.value))}
                                        disabled={voiceTransformEnabled}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                                    />
                                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                                        <span>Emotional</span>
                                        <span>Stable</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Similarity: {similarityBoost.toFixed(2)}
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={similarityBoost}
                                        onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
                                        disabled={voiceTransformEnabled}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                                    />
                                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                                        <span>Less</span>
                                        <span>More</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Speed: {speed.toFixed(2)}x
                                    </label>
                                    <input
                                        type="range"
                                        min="0.7"
                                        max="1.2"
                                        step="0.05"
                                        value={speed}
                                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                                        disabled={voiceTransformEnabled}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                                    />
                                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                                        <span>Slow</span>
                                        <span>Fast</span>
                                    </div>
                                </div>

                                <div className="border-t border-gray-700 pt-4">
                                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Quick Presets</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handlePreset("natural")}
                                            disabled={voiceTransformEnabled}
                                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Natural
                                        </button>
                                        <button
                                            onClick={() => handlePreset("expressive")}
                                            disabled={voiceTransformEnabled}
                                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Expressive
                                        </button>
                                        <button
                                            onClick={() => handlePreset("fast")}
                                            disabled={voiceTransformEnabled}
                                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Fast
                                        </button>
                                        <button
                                            onClick={() => handlePreset("serious")}
                                            disabled={voiceTransformEnabled}
                                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Serious
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4 text-white flex-1 overflow-hidden flex flex-col">
                        <h2 className="text-lg font-semibold mb-4">Transcripts</h2>

                        {partialTranscript && (
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-gray-400 mb-2">
                                    Partial
                                </h3>
                                <p className="text-gray-300 italic bg-gray-900/50 px-3 py-2 rounded-lg">
                                    {partialTranscript}
                                </p>
                            </div>
                        )}

                        {committedTranscripts.length > 0 && (
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <h3 className="text-sm font-semibold text-gray-400 mb-2">
                                    Committed ({committedTranscripts.length})
                                </h3>
                                <div className="space-y-2 overflow-y-auto flex-1">
                                    {committedTranscripts.slice().reverse().map((transcript) => (
                                        <div
                                            key={transcript.id}
                                            className="bg-gray-900/50 border border-gray-700 px-3 py-2 rounded-lg"
                                        >
                                            <p className="text-white text-sm mb-1">{transcript.text}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(transcript.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!partialTranscript && committedTranscripts.length === 0 && (
                            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                                {voiceTransformEnabled ? "Waiting for speech..." : "Enable voice transform to see transcripts"}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* AI Chat Sidebar */}
        <AIChatPanel
            isCollapsed={isChatCollapsed}
            onToggleCollapse={() => setIsChatCollapsed(!isChatCollapsed)}
            videoMicEnabled={micEnabled}
            onToggleVideoMic={toggleMic}
        />
        </>
    );
}
