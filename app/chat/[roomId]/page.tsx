'use client';

import { auth, db, functions } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
    addDoc,
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    where
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Message {
  id: string;
  content: string;
  senderType: 'user' | 'advisor';
  userId: string;
  advisorId: string;
  createdAt: unknown;
}

interface ChatRoom {
  id: string;
  userId: string;
  advisorId: string;
  status: string;
  createdAt: unknown;
}

interface ChatRequest {
  id: string;
  roomId: string;
  advisorId: string;
  userId: string;
  status: string;
  sessionId: string;
  paymentId: string;
  payment: object;
  createdAt: unknown;
  acceptedAt?: unknown;
  closedAt?: unknown;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatRequest, setChatRequest] = useState<ChatRequest | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        router.push('/login');
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (roomId && user) {
      // Listen to chat room data
      const unsubscribeChatRoom = onSnapshot(doc(db, 'chatRooms', roomId), (doc) => {
        if (doc.exists()) {
          setChatRoom({ id: doc.id, ...doc.data() } as ChatRoom);
        }
        setLoading(false);
      }, (error) => {
        console.error('Error listening to chat room:', error);
        setLoading(false);
      });

      // Listen to messages
      const unsubscribeMessages = onSnapshot(
        query(
          collection(db, 'chatRooms', roomId, 'messages'),
          orderBy('createdAt', 'asc')
        ),
        (snapshot) => {
          const msgs: Message[] = [];
          snapshot.forEach((doc) => {
            msgs.push({ id: doc.id, ...doc.data() } as Message);
          });
          setMessages(msgs);
        },
        (error) => {
          console.error('Error listening to messages:', error);
        }
      );

      // Listen to chat request data
      const unsubscribeChatRequest = onSnapshot(
        query(
          collection(db, 'chatRequests'),
          where('roomId', '==', roomId),
          where('advisorId', '==', user.uid)
        ),
        (snapshot) => {
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            setChatRequest({ id: doc.id, ...doc.data() } as ChatRequest);
          }
        }
      );

      return () => {
        unsubscribeChatRoom();
        unsubscribeMessages();
        unsubscribeChatRequest();
      };
    }
  }, [roomId, user]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatRoom) return;

    try {
      await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
        content: newMessage.trim(),
        senderType: 'advisor' as const, // This is the advisor web interface
        userId: chatRoom.userId, // The customer/user in this chat
        advisorId: chatRoom.advisorId, // The advisor in this chat
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const endSession = async () => {
    if (!chatRequest || !user) return;
    
    if (!confirm('Are you sure you want to end this chat session? This action cannot be undone.')) {
      return;
    }
    
    try {
      const endChatFunction = httpsCallable(functions, 'endChat');
      await endChatFunction({
        roomId: roomId,
        chatRequestId: chatRequest.id
      });
      
      // Redirect back to advisor dashboard
      router.push('/advisor');
    } catch (error) {
      console.error('Error ending session:', error);
      alert('Failed to end session');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!chatRoom || chatRoom.status=='closed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Chat Room Not Found</h1>
          <p className="text-gray-600 mb-4">Room ID: {roomId}</p>
          <button
            onClick={() => router.push('/advisor')}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              Chat with User
            </h1>
            <p className="text-sm text-gray-600">
              User ID: {chatRoom.userId.slice(0, 8)}...
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => router.push('/advisor')}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Back to Dashboard
            </button>
            <button
              onClick={endSession}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              End Session
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isFromAdvisor = message.senderType === 'advisor';
              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isFromAdvisor ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isFromAdvisor
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-800 border'
                    }`}
                  >
                    <p className="break-words">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isFromAdvisor
                          ? 'text-blue-200'
                          : 'text-gray-500'
                      }`}
                    >
                      {(message.createdAt as { toDate?: () => Date })?.toDate?.()?.toLocaleTimeString() || 'Sending...'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Input */}
        <div className="bg-white border-t p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}