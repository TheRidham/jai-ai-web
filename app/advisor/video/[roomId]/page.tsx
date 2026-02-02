"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useVideoRoom } from "@/hooks/useVideoRoom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import AIChatPanel from "@/components/AIChatPanel";

export default function VideoCallPage() {
    const router = useRouter();
    const { roomId } = useParams() as { roomId: string };
    const [authReady, setAuthReady] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);
    const [isChatCollapsed, setIsChatCollapsed] = useState(false);

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
    } = useVideoRoom({ roomId });

    // Wait for auth to be ready
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
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

    const handleLeave = async () => {
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
            console.error("Error leaving room:", error);
        }

        leaveRoom();
        router.push("/advisor/dashboard");
    };

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
        <div className={`flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 max-w-6xl mx-auto min-h-screen transition-all duration-300 ${isChatCollapsed ? '' : 'lg:pr-[420px]'}`}>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 flex-1">
                <div className="flex flex-col gap-2 bg-gray-100 rounded-lg overflow-hidden relative">
                    <h3 className="text-base sm:text-lg font-semibold px-3 sm:px-4 py-2 sm:py-3 bg-gray-200">You</h3>
                    <div
                        className="relative flex-1 min-h-60 sm:min-h-80 bg-black flex items-center justify-center overflow-hidden"
                        ref={localVideoRef}
                        suppressHydrationWarning
                    />
                    {connecting && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none">
                            <div className="text-white text-center">
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
                            <p className="text-white font-semibold text-center">
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
                    disabled={connecting}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base ${micEnabled
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : "bg-red-500 hover:bg-red-600 text-white"
                        }`}
                >
                    <span className="hidden sm:inline">{micEnabled ? "🎤 Unmuted" : "🎤 Muted"}</span>
                    <span className="sm:hidden">{micEnabled ? "🎤" : "🎤✕"}</span>
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
