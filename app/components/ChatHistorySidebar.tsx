"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  X,
  MessageSquare,
  User,
  Calendar,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";
import Image from "next/image";

interface ChatMessage {
  id: string;
  content: string;
  senderType: "user" | "advisor";
  createdAt: any;
  file?: {
    fileUrl?: string;
    name?: string;
    type?: string;
  };
  isAudioMessage?: boolean;
  transcription?: string;
}

interface ChatRoomData {
  id: string;
  roomId: string;
  advisorId: string;
  advisorName?: string;
  advisorEmail?: string;
  advisorPhoto?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhoto?: string;
  status: string;
  createdAt: any;
  lastMessage?: string;
  lastMessageTime?: any;
  messageCount: number;
  messages: ChatMessage[];
}

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatHistorySidebar({
  isOpen,
  onClose,
}: ChatHistorySidebarProps) {
  const [chatRooms, setChatRooms] = useState<ChatRoomData[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<ChatRoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAllChats();
    }
  }, [isOpen]);

  useEffect(() => {
    filterChats();
  }, [searchQuery, chatRooms]);

  const fetchAllChats = async () => {
    setLoading(true);
    try {
      // Fetch all chat requests
      const chatRequestsSnapshot = await getDocs(
        query(collection(db, "chatRequests"), orderBy("createdAt", "desc"))
      );

      const roomsData: ChatRoomData[] = [];

      for (const requestDoc of chatRequestsSnapshot.docs) {
        const requestData = requestDoc.data();
        const roomId = requestData.roomId;

        if (!roomId) continue;

        // Fetch advisor details
        let advisorName = "Unknown Advisor";
        let advisorEmail = "";
        let advisorPhoto = "";

        if (requestData.advisorId) {
          try {
            const advisorDoc = await getDoc(
              doc(db, "advisors", requestData.advisorId)
            );
            if (advisorDoc.exists()) {
              const advisorData = advisorDoc.data();
              advisorName = advisorData.name || "Unknown Advisor";
              advisorEmail = advisorData.email || "";
              advisorPhoto = advisorData.profilePhoto || "";
            }
          } catch (error) {
            console.error("Error fetching advisor:", error);
          }
        }

        // Fetch user details
        let userName = "Unknown User";
        let userEmail = "";
        let userPhoto = "";

        if (requestData.userId) {
          try {
            const userDoc = await getDoc(doc(db, "users", requestData.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userName =
                userData.name || userData.displayName || "Unknown User";
              userEmail = userData.email || "";
              userPhoto = userData.profilePhoto || userData.photoURL || "";
            }
          } catch (error) {
            console.error("Error fetching user:", error);
          }
        }

        // Fetch messages for this room
        const messagesSnapshot = await getDocs(
          query(
            collection(db, `chatRooms/${roomId}/messages`),
            orderBy("createdAt", "desc")
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

        const lastMessage = messages[0]?.content || "No messages yet";
        const lastMessageTime = messages[0]?.createdAt;

        roomsData.push({
          id: requestDoc.id,
          roomId,
          advisorId: requestData.advisorId,
          advisorName,
          advisorEmail,
          advisorPhoto,
          userId: requestData.userId,
          userName,
          userEmail,
          userPhoto,
          status: requestData.status || "unknown",
          createdAt: requestData.createdAt,
          lastMessage,
          lastMessageTime,
          messageCount: messages.length,
          messages,
        });
      }

      setChatRooms(roomsData);
    } catch (error) {
      console.error("Error fetching chat history:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterChats = () => {
    let filtered = [...chatRooms];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (room) =>
          room.advisorName?.toLowerCase().includes(query) ||
          room.userName?.toLowerCase().includes(query) ||
          room.advisorEmail?.toLowerCase().includes(query) ||
          room.userEmail?.toLowerCase().includes(query)
      );
    }

    setFilteredRooms(filtered);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const toggleRoomExpansion = (roomId: string) => {
    setExpandedRoomId(expandedRoomId === roomId ? null : roomId);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[600px] lg:w-[700px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Chat History</h2>
              <p className="text-blue-100 text-sm">
                All advisor conversations ({chatRooms.length})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by advisor or user name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Loading chats...</span>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-20 px-4">
              <MessageSquare className="w-16 h-16 mx-auto text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-600">
                No chats found
              </h3>
              <p className="text-gray-400 mt-1">
                {searchQuery
                  ? "Try adjusting your search"
                  : "No chat history available yet"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-4">
              {filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white border border-gray-400 rounded-xl hover:bg-gray-50"
                >
                  {/* Chat Room Header */}
                  <button
                    onClick={() => toggleRoomExpansion(room.roomId)}
                    className="w-full p-4 text-left transition-colors"
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 relative">
                        {room.advisorPhoto ? (
                          <Image
                            src={room.advisorPhoto}
                            alt={room.advisorName || "Advisor"}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-6 h-6 text-blue-600" />
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1">
                          {room.userPhoto ? (
                            <Image
                              src={room.userPhoto}
                              alt={room.userName || "User"}
                              width={24}
                              height={24}
                              className="w-6 h-6 rounded-full object-cover border-2 border-white"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center border-2 border-white">
                              <User className="w-3 h-3 text-gray-500" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {room.advisorName}
                            </h4>
                            <p className="text-sm text-gray-500 truncate">
                              with {room.userName}
                            </p>
                          </div>
                          <ChevronRight
                            className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                              expandedRoomId === room.roomId ? "rotate-90" : ""
                            }`}
                          />
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span
                            className={`px-2 py-0.5 rounded-full font-medium ${
                              room.status === "active"
                                ? "bg-green-100 text-green-700"
                                : room.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : room.status === "closed" ||
                                  room.status === "completed"
                                ? "bg-gray-200 text-black"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {room.status}
                          </span>
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-black">{room.messageCount} messages</span>
                        </div>

                        <p className="mt-1 text-sm text-gray-600 truncate">
                          {room.lastMessage}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatMessageTime(room.lastMessageTime)}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Messages */}
                  {expandedRoomId === room.roomId && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4 max-h-96 overflow-y-auto">
                      <div className="space-y-3">
                        {room.messages.length === 0 ? (
                          <p className="text-center text-gray-500 text-sm py-4">
                            No messages in this conversation
                          </p>
                        ) : (
                          room.messages
                            .slice()
                            .reverse()
                            .map((message) => (
                              <div
                                key={message.id}
                                className={`flex ${
                                  message.senderType === "advisor"
                                    ? "justify-end"
                                    : "justify-start"
                                }`}
                              >
                                <div
                                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                                    message.senderType === "advisor"
                                      ? "bg-blue-500 text-white"
                                      : "bg-white text-gray-800 border border-gray-200"
                                  }`}
                                >
                                  <p className="text-sm font-medium mb-1">
                                    {message.senderType === "advisor"
                                      ? room.advisorName
                                      : room.userName}
                                  </p>
                                  {message.file && (
                                    <div className="mb-2">
                                      <a
                                        href={
                                          message.file.fileUrl ||
                                          message.file.name
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs underline"
                                      >
                                        📎 {message.file.name || "Attachment"}
                                      </a>
                                    </div>
                                  )}
                                  {message.isAudioMessage && (
                                    <p className="text-xs mb-1">
                                      🎤 Audio Message
                                    </p>
                                  )}
                                  <p className="text-sm break-words">
                                    {message.content ||
                                      message.transcription ||
                                      "(No text)"}
                                  </p>
                                  <p
                                    className={`text-xs mt-1 ${
                                      message.senderType === "advisor"
                                        ? "text-blue-100"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {formatDate(message.createdAt)}
                                  </p>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
