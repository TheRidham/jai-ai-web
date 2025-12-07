"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types/user";
import { 
  ArrowLeft, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Calendar, 
  Wallet, 
  Gift,
  MessageSquare,
  Bot,
  UserCheck,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface ChatMessage {
  id: string;
  content: string;
  senderType: "user" | "advisor" | "ai";
  createdAt: any;
  file?: {
    fileUrl?: string;
    name?: string;
    type?: string;
  };
  isAudioMessage?: boolean;
  transcription?: string;
}

interface ChatRoom {
  id: string;
  roomId: string;
  advisorId?: string;
  advisorName?: string;
  type: "ai" | "human";
  status: string;
  createdAt: any;
  lastMessage?: string;
  messageCount: number;
  messages: ChatMessage[];
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUserData();
      fetchChatHistory();
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUser({
          id: userDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastUpdated: data.lastUpdated?.toDate() || new Date(),
        } as User);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchChatHistory = async () => {
    try {
      // Fetch ALL chat requests first, then filter by userId
      // This avoids composite index issues
      const chatRequestsSnapshot = await getDocs(
        query(collection(db, "chatRequests"), orderBy("createdAt", "desc"))
      );

      console.log("Total chat requests found:", chatRequestsSnapshot.docs.length);

      const rooms: ChatRoom[] = [];

      for (const requestDoc of chatRequestsSnapshot.docs) {
        const requestData = requestDoc.data();
        
        // Filter by userId
        if (requestData.userId !== userId) continue;
        
        const roomId = requestData.roomId;
        console.log("Found chat for user:", { roomId, userId: requestData.userId });

        if (!roomId) continue;

        // Fetch advisor name if exists
        let advisorName = "Unknown Advisor";
        if (requestData.advisorId) {
          try {
            const advisorDoc = await getDoc(doc(db, "advisors", requestData.advisorId));
            if (advisorDoc.exists()) {
              advisorName = advisorDoc.data().name || "Unknown Advisor";
            }
          } catch (error) {
            console.error("Error fetching advisor:", error);
          }
        }

        // Fetch messages for this room
        try {
          const messagesSnapshot = await getDocs(
            query(
              collection(db, `chatRooms/${roomId}/messages`),
              orderBy("createdAt", "asc")
            )
          );

          console.log(`Messages found for room ${roomId}:`, messagesSnapshot.docs.length);

          const messages: ChatMessage[] = messagesSnapshot.docs.map((msgDoc) => {
            const msgData = msgDoc.data();
            return {
              id: msgDoc.id,
              content: msgData.content || msgData.text || "",
              senderType: msgData.senderType || "user",
              createdAt: msgData.createdAt,
              file: msgData.file,
              isAudioMessage: msgData.isAudioMessage,
              transcription: msgData.transcription || msgData.transcript,
            };
          });

          rooms.push({
            id: requestDoc.id,
            roomId,
            advisorId: requestData.advisorId,
            advisorName,
            type: requestData.advisorId ? "human" : "ai",
            status: requestData.status || "unknown",
            createdAt: requestData.createdAt,
            lastMessage: messages[messages.length - 1]?.content || "No messages",
            messageCount: messages.length,
            messages,
          });
        } catch (msgError) {
          console.error(`Error fetching messages for room ${roomId}:`, msgError);
        }
      }

      // Also check chatRooms collection directly for any rooms with this userId
      try {
        const chatRoomsSnapshot = await getDocs(collection(db, "chatRooms"));
        
        for (const roomDoc of chatRoomsSnapshot.docs) {
          const roomData = roomDoc.data();
          
          // Check if this room belongs to the user and isn't already added
          if (roomData.userId === userId && !rooms.find(r => r.roomId === roomDoc.id)) {
            console.log("Found additional room in chatRooms:", roomDoc.id);
            
            // Fetch messages
            const messagesSnapshot = await getDocs(
              query(
                collection(db, `chatRooms/${roomDoc.id}/messages`),
                orderBy("createdAt", "asc")
              )
            );

            const messages: ChatMessage[] = messagesSnapshot.docs.map((msgDoc) => {
              const msgData = msgDoc.data();
              return {
                id: msgDoc.id,
                content: msgData.content || msgData.text || "",
                senderType: msgData.senderType || "user",
                createdAt: msgData.createdAt,
                file: msgData.file,
                isAudioMessage: msgData.isAudioMessage,
                transcription: msgData.transcription || msgData.transcript,
              };
            });

            if (messages.length > 0) {
              rooms.push({
                id: roomDoc.id,
                roomId: roomDoc.id,
                advisorId: roomData.advisorId,
                advisorName: roomData.advisorName || "Advisor",
                type: roomData.advisorId ? "human" : "ai",
                status: roomData.status || "completed",
                createdAt: roomData.createdAt,
                lastMessage: messages[messages.length - 1]?.content || "No messages",
                messageCount: messages.length,
                messages,
              });
            }
          }
        }
      } catch (error) {
        console.log("Error checking chatRooms collection:", error);
      }

      // Also fetch AI chat history if stored separately
      try {
        const aiChatsSnapshot = await getDocs(collection(db, "aiChats"));
        
        for (const aiChatDoc of aiChatsSnapshot.docs) {
          const aiChatData = aiChatDoc.data();
          
          if (aiChatData.userId !== userId) continue;
          
          console.log("Found AI chat:", aiChatDoc.id);
          
          // Fetch messages for AI chat
          const messagesSnapshot = await getDocs(
            query(
              collection(db, `aiChats/${aiChatDoc.id}/messages`),
              orderBy("createdAt", "asc")
            )
          );

          const messages: ChatMessage[] = messagesSnapshot.docs.map((msgDoc) => {
            const msgData = msgDoc.data();
            return {
              id: msgDoc.id,
              content: msgData.content || msgData.text || "",
              senderType: msgData.senderType || (msgData.role === "assistant" ? "ai" : "user"),
              createdAt: msgData.createdAt,
            };
          });

          if (messages.length > 0) {
            rooms.push({
              id: aiChatDoc.id,
              roomId: aiChatDoc.id,
              type: "ai",
              status: "completed",
              createdAt: aiChatData.createdAt,
              lastMessage: messages[messages.length - 1]?.content || "No messages",
              messageCount: messages.length,
              messages,
            });
          }
        }
      } catch (error) {
        // AI chats collection might not exist
        console.log("No separate AI chats collection or error:", error);
      }

      console.log("Total rooms found for user:", rooms.length);
      setChatRooms(rooms);
    } catch (error) {
      console.error("Error fetching chat history:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleRoom = (roomId: string) => {
    setExpandedRoom(expandedRoom === roomId ? null : roomId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <UserIcon className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700">User Not Found</h2>
          <p className="text-gray-500 mt-2">The user you're looking for doesn't exist.</p>
          <button
            onClick={() => router.back()}
            className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Users</span>
        </button>

        {/* User Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <UserIcon className="w-12 h-12" />
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-3xl font-bold text-gray-900">{user.name || "Unknown"}</h1>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-sm font-medium rounded-full">
                  {user.gender || "Unknown"}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                  {user.age ? `${user.age} years` : "Unknown age"}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[150px]">{user.email || "Unknown"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Phone className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-800">{user.phone || "Unknown"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Wallet Balance</p>
                    <p className="text-sm font-bold text-green-600">₹{user.walletBalance?.toLocaleString() || "0"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user.hasClaimedFreeCash ? "bg-purple-100" : "bg-gray-100"}`}>
                    <Gift className={`w-5 h-5 ${user.hasClaimedFreeCash ? "text-purple-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Free Cash</p>
                    <p className={`text-sm font-medium ${user.hasClaimedFreeCash ? "text-purple-600" : "text-gray-500"}`}>
                      {user.hasClaimedFreeCash ? "Claimed" : "Not Claimed"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>Joined {user.createdAt?.toLocaleDateString() || "Unknown"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat History Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Chat History</h2>
          <p className="text-gray-500">View all conversations with AI and human advisors</p>
        </div>

        {/* Chat Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{chatRooms.length}</p>
              <p className="text-sm text-gray-500">Total Conversations</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{chatRooms.filter(r => r.type === "ai").length}</p>
              <p className="text-sm text-gray-500">AI Conversations</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{chatRooms.filter(r => r.type === "human").length}</p>
              <p className="text-sm text-gray-500">Human Advisor Chats</p>
            </div>
          </div>
        </div>

        {/* Chat Rooms List */}
        <div className="space-y-4">
          {chatRooms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700">No Chat History</h3>
              <p className="text-gray-500 mt-2">This user hasn't started any conversations yet.</p>
            </div>
          ) : (
            chatRooms.map((room) => (
              <div key={room.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Room Header */}
                <button
                  onClick={() => toggleRoom(room.id)}
                  className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      room.type === "ai" 
                        ? "bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30" 
                        : "bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30"
                    }`}>
                      {room.type === "ai" ? (
                        <Bot className="w-6 h-6 text-white" />
                      ) : (
                        <UserCheck className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {room.type === "ai" ? "AI Assistant" : room.advisorName || "Human Advisor"}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          room.status === "completed" || room.status === "ended"
                            ? "bg-gray-100 text-gray-600"
                            : room.status === "active"
                            ? "bg-green-100 text-green-600"
                            : "bg-yellow-100 text-yellow-600"
                        }`}>
                          {room.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate max-w-md">{room.lastMessage}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MessageSquare className="w-4 h-4" />
                        <span>{room.messageCount} messages</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(room.createdAt)}</span>
                      </div>
                    </div>
                    {expandedRoom === room.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Messages */}
                {expandedRoom === room.id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-5 max-h-96 overflow-y-auto">
                    <div className="space-y-4">
                      {room.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderType === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                              message.senderType === "user"
                                ? "bg-blue-500 text-white rounded-br-md"
                                : message.senderType === "ai"
                                ? "bg-purple-100 text-purple-900 rounded-bl-md"
                                : "bg-white text-gray-800 border border-gray-200 rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            {message.isAudioMessage && message.transcription && (
                              <p className="text-xs mt-2 opacity-75 italic">
                                🎤 {message.transcription}
                              </p>
                            )}
                            {message.file && (
                              <div className="mt-2 text-xs opacity-75">
                                📎 {message.file.name || "Attachment"}
                              </div>
                            )}
                            <p className={`text-xs mt-1 ${
                              message.senderType === "user" ? "text-blue-200" : "text-gray-400"
                            }`}>
                              {formatDate(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
