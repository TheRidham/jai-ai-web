"use client";

import { auth, db, functions } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  documentId,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import VideoChatRequests from "@/app/components/VideoChatRequests";

export interface ChatRequest {
  id: string;
  userId: string;
  advisorId: string;
  roomId: string;
  status: "active" | "accepted" | "closed";
  isVideo: boolean;
  createdAt: unknown;
  acceptedAt?: unknown;
  paymentMethod?: "wallet" | "razorpay";
  payment?: {
    sessionId?: string;
    paymentId?: string;
    method?: "wallet" | "razorpay";
    walletTransactionId?: string;
  };
  user?: {
    name?: string;
    phone?: string;
    phoneNumber?: string;
    email?: string;
  } | null;
}

export interface Advisor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string[];
  certification: string;
  experience: string;
  busy: boolean;
  busySince?: unknown;
  totalUsersAttended: number;
  isActive?: boolean;
}

export default function AdvisorDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [videoChatRequest, setVideoChatRequest] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (user) {
      const advisorQuery = query(
        collection(db, "advisors"),
        where("uid", "==", user.uid)
      );

      let unsubscribeChatRequests: (() => void) | null = null;
      const unsubscribeAdvisor = onSnapshot(advisorQuery, (snapshot) => {
        if (!snapshot.empty) {
          const advisorDoc = snapshot.docs[0];
          const adv = { id: advisorDoc.id, ...advisorDoc.data() } as Advisor;
          setAdvisor(adv);

          if (unsubscribeChatRequests) {
            try {
              unsubscribeChatRequests();
            } catch {
              /* ignore */
            }
            unsubscribeChatRequests = null;
          }

          const chatReqQuery = query(
            collection(db, "chatRequests"),
            where("advisorId", "==", adv.id),
            where("status", "==", "active")
          );

          unsubscribeChatRequests = onSnapshot(chatReqQuery, (snap) => {
            (async () => {
              const chatReqs: ChatRequest[] = [];
              const videoReqs: ChatRequest[] = [];
              snap.forEach((d) => {
                const data = d.data();
                const request = { id: d.id, ...data } as ChatRequest;
                if (data.isVideo === true) {
                  videoReqs.push(request);
                } else {
                  chatReqs.push(request);
                }
              });

              const allRequests = [...chatReqs, ...videoReqs];

              try {
                const userIds = Array.from(
                  new Set(allRequests.map((r) => r.userId).filter(Boolean))
                );
                const usersMap: Record<string, ChatRequest["user"]> = {};

                if (userIds.length > 0) {
                  if (userIds.length <= 10) {
                    try {
                      const usersQuery = query(
                        collection(db, "users"),
                        where(documentId(), "in", userIds)
                      );
                      const usersSnap = await getDocs(usersQuery);
                      usersSnap.forEach((u) => {
                        usersMap[u.id] = u.data();
                      });
                    } catch (qErr) {
                      console.error(
                        "Failed users query, falling back to per-doc fetch",
                        qErr
                      );
                      await Promise.all(
                        userIds.map(async (uid) => {
                          try {
                            const uDoc = await getDoc(doc(db, "users", uid));
                            if (uDoc.exists()) usersMap[uid] = uDoc.data();
                          } catch (err) {
                            console.error("Failed to fetch user", uid, err);
                          }
                        })
                      );
                    }
                  } else {
                    await Promise.all(
                      userIds.map(async (uid) => {
                        try {
                          const uDoc = await getDoc(doc(db, "users", uid));
                          if (uDoc.exists()) usersMap[uid] = uDoc.data();
                        } catch (e) {
                          console.error("Failed to fetch user", uid, e);
                        }
                      })
                    );
                  }
                }

                const augmentedChat = chatReqs.map((r) => ({
                  ...r,
                  user: usersMap[r.userId] || null,
                }));

                const augmentedVideo = videoReqs.map((r) => ({
                  ...r,
                  user: usersMap[r.userId] || null,
                }));

                setChatRequests(augmentedChat);
                setVideoChatRequest(augmentedVideo);
              } catch (err) {
                console.error(
                  "Error attaching user details to chat requests",
                  err
                );
                setChatRequests(chatReqs);
                setVideoChatRequest(videoReqs);
              }
            })();
          });
        }
        setLoading(false);
      });

      return () => {
        unsubscribeAdvisor();
        if (unsubscribeChatRequests)
          try {
            unsubscribeChatRequests();
          } catch {
            /* ignore */
          }
      };
    }
  }, [user]);

  const toggleAvailability = async () => {
    if (!advisor || !user) return;

    try {
      await updateDoc(doc(db, "advisors", advisor.id), {
        busy: !advisor.busy,
        busySince: advisor.busy ? null : new Date(),
      });
    } catch (error) {
      console.error("Error updating availability:", error);
      alert("Failed to update availability");
    }
  };

  const joinChat = async (roomId: string, chatRequestId: string) => {
    try {
      const chatRequestRef = doc(db, "chatRequests", chatRequestId);
      await updateDoc(chatRequestRef, { isAdvisorJoined: true });
      window.open(`/advisor/chat/${roomId}`, "_blank");
    } catch (error) {
      console.log("failed to update", error);
    }
  };

  const endSession = async (requestId: string) => {
    if (!user || !advisor) return;

    try {
      const chatRequestDoc = await getDoc(doc(db, "chatRequests", requestId));
      if (!chatRequestDoc.exists()) {
        alert("Chat request not found");
        return;
      }

      const chatRequestData = chatRequestDoc.data();

      await updateDoc(doc(db, "chatRequests", requestId), {
        status: "closed",
        closedAt: new Date(),
      });

      await updateDoc(doc(db, "advisors", advisor.id), {
        totalUsersAttended: (advisor.totalUsersAttended || 0) + 1,
        busy: false,
      });

      try {
        const endChatFunction = httpsCallable(functions, "endChat");
        await endChatFunction({
          roomId: chatRequestData.roomId,
          chatRequestId: requestId,
        });
      } catch (fnError) {
        console.log(
          "Cloud function not available, but session ended successfully",
          fnError
        );
      }
    } catch (error) {
      console.error("Error ending session:", error);
      alert("Failed to end session");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-slate-600 font-medium">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-slate-600 font-medium">
            Loading advisor dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!advisor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white py-4 rounded-2xl shadow-xl border border-slate-200 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">
            Advisor Profile Not Found
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            No advisor profile found for your account. Please sign up first.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/signup")}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 px-5 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
            >
              Sign Up
            </button>
            <button
              onClick={handleSignOut}
              className="bg-slate-100 text-slate-700 py-2.5 px-5 rounded-xl font-medium hover:bg-slate-200 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 mb-3 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
                {advisor.name?.charAt(0)?.toUpperCase() || "A"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-800">
                    {advisor.name}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${advisor.busy
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                      }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${advisor.busy
                        ? "bg-red-500"
                        : "bg-green-500 animate-pulse"
                        }`}
                    ></span>
                    {advisor.busy ? "Busy" : "Available"}
                  </span>
                </div>

                <p className="text-slate-500 text-sm mt-1">
                  {Array.isArray(advisor.specialization)
                    ? advisor.specialization.join(" • ")
                    : advisor.specialization}
                </p>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {advisor.experience} years exp
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
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
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                    {advisor.certification}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium">
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    {advisor.totalUsersAttended || 0} users helped
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={toggleAvailability}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm ${advisor.busy
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                  }`}
              >
                {advisor.busy ? (
                  <>
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Go Available
                  </>
                ) : (
                  <>
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
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                    Go Busy
                  </>
                )}
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
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
                    Chat Requests
                  </h2>
                  <p className="text-sm text-slate-500">
                    {chatRequests.length} active{" "}
                    {chatRequests.length === 1 ? "session" : "sessions"}
                  </p>
                </div>
              </div>
              {chatRequests.length > 0 && (
                <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                  {chatRequests.length}
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            {chatRequests.length === 0 ? (
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
                {chatRequests.map((request) => (
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
                        <button
                          onClick={() => joinChat(request.roomId, request.id)}
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
                          Join Chat
                        </button>
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
            <VideoChatRequests videoChatRequests={videoChatRequest} endSession={endSession} />
          </div>
        </div>
      </div>
    </div>
  );
}
