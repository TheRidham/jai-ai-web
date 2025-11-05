'use client';

import { auth, db, functions } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Message {
  id: string;
  content: string;
  // Optional file info for attachments (images, audio, documents)
  file?: {
    fileUrl?: string;
    uri?: string;
    name?: string;
    type?: string;
  };
  // Flag for voice/audio messages
  isAudioMessage?: boolean;
  // Optional transcription for audio messages
  transcription?: string;
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

// Firestore message shape (may vary between clients/mobile/web)
interface MessageFirestore {
  content?: string;
  text?: string;
  file?: { fileUrl?: string; uri?: string; name?: string; type?: string } | null;
  fileUrl?: string;
  audioUrl?: string;
  audioType?: string;
  audioName?: string;
  isAudioMessage?: boolean;
  transcription?: string;
  transcript?: string;
  senderType?: 'user' | 'advisor';
  userId?: string;
  advisorId?: string;
  createdAt?: unknown;
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
  const [chatUser, setChatUser] = useState<{ name?: string; phone?: string; email?: string } | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        router.push('/signin');
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

      // Listen to messages and normalize message shape so web supports mobile-sent audio
      const unsubscribeMessages = onSnapshot(
        query(
          collection(db, 'chatRooms', roomId, 'messages'),
          orderBy('createdAt', 'asc')
        ),
        (snapshot) => {
          const msgs: Message[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as MessageFirestore;

            // Normalize fields from mobile/web differences:
            // - some clients use `text` while web expects `content`
            // - some clients store the uploaded URL as `file.fileUrl` or as `fileUrl` on root
            // - audio messages may be marked with `isAudioMessage` or can be inferred from file type/extension
            const content = data.content ?? data.text ?? '';

            let file = data.file ?? undefined;
            // Support legacy/root keys: fileUrl or audioUrl (mobile sends audioUrl/audioType/audioName)
            if (!file && data.fileUrl) {
              file = { fileUrl: data.fileUrl };
            }
            if (!file && data.audioUrl) {
              file = {
                fileUrl: data.audioUrl,
                type: data.audioType,
                name: data.audioName,
              };
            }

            const fileUrl = file?.fileUrl || file?.uri;

            const isAudioFromType = !!(
              file && (
                (file.type && typeof file.type === 'string' && file.type.startsWith('audio/')) ||
                (fileUrl && /\.(mp3|m4a|wav|aac|ogg|webm)$/i.test(fileUrl))
              )
            );

            const normalized: Message = {
              id: doc.id,
              content,
              file,
              isAudioMessage: data.isAudioMessage || isAudioFromType || false,
              transcription: data.transcription ?? data.transcript ?? undefined,
              senderType: data.senderType,
              userId: data.userId,
              advisorId: data.advisorId,
              createdAt: data.createdAt,
            } as Message;

            msgs.push(normalized);
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
          where('roomId', '==', roomId)
        ),
        (snapshot) => {
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            setChatRequest({ id: doc.id, ...doc.data() } as ChatRequest);
          } else {
            console.warn('No chat request found for this room:', roomId);
          }
        },
        (error) => console.error('Error listening to chat request:', error)
      );


      // Fetch the requesting user's profile once we know the chat room's userId
      // We'll watch chatRoom via onSnapshot above and fetch here when available
      const fetchChatUser = async (uid?: string) => {
        if (!uid) return setChatUser(null);
        try {
          const uDoc = await getDoc(doc(db, 'users', uid));
          if (uDoc.exists()) setChatUser(uDoc.data() as { name?: string; phone?: string; email?: string });
          else setChatUser(null);
        } catch (err: unknown) {
          console.error('Failed to fetch chat user profile', err);
          setChatUser(null);
        }
      };

      // Also set up a small watcher: when chatRoom snapshot updates, fetch the user
      const unsubRoomWatcher = onSnapshot(doc(db, 'chatRooms', roomId), (r) => {
        if (r.exists()) {
          const data = r.data() as Partial<ChatRoom> | undefined;
          fetchChatUser(data?.userId as string | undefined);
        }
      }, (err: unknown) => console.error('room watcher error', err));
      return () => {
        unsubscribeChatRoom();
        unsubscribeMessages();
        unsubscribeChatRequest();
        unsubRoomWatcher();
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
      // First try the cloud function
      const endChatFunction = httpsCallable(functions, 'endChat');
      await endChatFunction({
        roomId: roomId,
        chatRequestId: chatRequest.id
      });
      
      // Redirect back to advisor dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error with cloud function, attempting fallback:', error);
      
      try {
        // Fallback implementation if cloud function fails
        const reqRef = doc(db, 'chatRequests', chatRequest.id);
        const reqSnap = await getDoc(reqRef);
        const reqData = reqSnap.data();
        const sessionId = reqData?.payment?.sessionId;

        // Run all updates in a transaction
        await runTransaction(db, async (transaction) => {
          // Do all reads first
          const roomRef = doc(db, 'chatRooms', roomId);
          const roomSnap = await transaction.get(roomRef);
          
          if (!roomSnap.exists()) {
            throw new Error('Room not found');
          }
          
          // Read payment session if exists
          let sessionExists = false;
          if (sessionId) {
            const sessionRef = doc(db, 'paymentSessions', sessionId);
            const sessionSnap = await transaction.get(sessionRef);
            sessionExists = sessionSnap.exists();
          }

          // Now do all writes
          const roomData = roomSnap.data();
          const { advisorId, userId } = roomData;
          
          if (user.uid !== advisorId && user.uid !== userId) {
            throw new Error('Not a participant');
          }

          // Update advisor status
          const advisorRef = doc(db, 'advisors', advisorId);
          const advisorSnap = await transaction.get(advisorRef);
          
          if (!advisorSnap.exists()) {
            throw new Error('Advisor doc not found');
          }
          
          transaction.update(advisorRef, {
            busy: false,
            busySince: deleteField(),
            totalUsersAttended: increment(1)
          });

          // Update room status
          transaction.update(roomRef, {
            status: 'closed',
            closedAt: serverTimestamp(),
          });

          // Update chat request status
          transaction.update(reqRef, {
            status: 'closed',
            closedAt: serverTimestamp(),
          });

          // Update payment session if exists
          if (sessionId && sessionExists) {
            const sessionRef = doc(db, 'paymentSessions', sessionId);
            transaction.update(sessionRef, {
              status: 'ended',
              endedAt: serverTimestamp(),
            });
          }
        });

        // Redirect back to advisor dashboard after successful fallback
        router.push('/dashboard');
      } catch (fallbackError) {
        console.error('Error in fallback implementation:', fallbackError);
        alert('Failed to end session');
      }
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
            onClick={() => router.push('/dashboard')}
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
                Chat with {chatUser?.name || 'User'}
              </h1>
              <p className="text-sm text-gray-600">
                {chatUser?.name ? `(${chatUser.name})` : `User ID: ${chatRoom.userId.slice(0, 8)}...`}
              </p>
            </div>
          <div className="flex space-x-2">
            <button
              onClick={() => router.push('/dashboard')}
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
                    {/* Render audio player for audio messages (sent from mobile) */}
                    {message.isAudioMessage && (message.file?.fileUrl || message.file?.uri) ? (
                      <div className="flex flex-col space-y-2">
                        <audio
                          controls
                          src={message.file?.fileUrl || message.file?.uri}
                          className="w-full"
                        >
                          Your browser does not support the audio element.
                        </audio>
                        {message.transcription ? (
                          <div className="text-sm italic text-gray-600 bg-gray-50 p-2 rounded">
                            {message.transcription}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="break-words">{message.content}</p>
                    )}
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