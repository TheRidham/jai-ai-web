import { ChatRequest } from "../advisor/dashboard/page";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
    videoChatRequests: ChatRequest[];
    endSession: (requestId: string) => void;
}

export default function VideoChatRequests({ videoChatRequests, endSession }: Props) {

    const router = useRouter();

    const handleJoinCall = (roomId: string) => {
        router.push(`/advisor/video/${roomId}`);
    }

    return (
        <div>
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                            <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">
                                Video Chat Requests
                            </h2>
                            <p className="text-sm text-slate-500">
                                {videoChatRequests.length} active{" "}
                                {videoChatRequests.length === 1 ? "session" : "sessions"}
                            </p>
                        </div>
                    </div>
                    {videoChatRequests.length > 0 && (
                        <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                            {videoChatRequests.length}
                        </span>
                    )}
                </div>
            </div>
            {videoChatRequests.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <svg
                            className="w-10 h-10 text-slate-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                        </svg>
                    </div>
                    <p className="text-slate-700 font-medium text-lg">
                        No active requests
                    </p>
                    <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                        New chat requests will appear here automatically when users
                        reach out for help.
                    </p>
                </div>
            ) : (
                <div className="grid gap-">
                    {videoChatRequests.map((request) => (
                        <div
                            key={request.id}
                            className="group border border-slate-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-md transition-all bg-gradient-to-r from-white to-slate-50/50"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg shadow-md flex-shrink-0">
                                        {request.user?.name
                                            ? String(request.user.name)
                                                .split(" ")
                                                .map((p) => (p && p[0] ? p[0] : ""))
                                                .slice(0, 2)
                                                .join("")
                                                .toUpperCase()
                                            : "?"}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-slate-800 truncate">
                                                {request.user?.name || "Unknown User"}
                                            </h3>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                                                New Request
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500 flex-wrap">
                                            {(request.user?.phone ||
                                                request.user?.phoneNumber) && (
                                                    <span className="flex items-center gap-1">
                                                        <svg
                                                            className="w-3.5 h-3.5"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                                            />
                                                        </svg>
                                                        {request.user?.phone ||
                                                            request.user?.phoneNumber}
                                                    </span>
                                                )}
                                            {request.user?.email && (
                                                <span className="flex items-center gap-1 truncate">
                                                    <svg
                                                        className="w-3.5 h-3.5 flex-shrink-0"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                                        />
                                                    </svg>
                                                    <span className="truncate">
                                                        {request.user?.email}
                                                    </span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs">
                                                <svg
                                                    className="w-3 h-3"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                                                    />
                                                </svg>
                                                {request.payment?.method === "wallet" ||
                                                    request.paymentMethod === "wallet"
                                                    ? "Wallet"
                                                    : "Razorpay"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Link
                                        href={`/advisor/video/${request.roomId}`}
                                        target="_blank"
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md"
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                            />
                                        </svg>
                                        Join Video
                                    </Link>
                                    <button
                                        onClick={() => endSession(request.id)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-all"
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                        End
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}