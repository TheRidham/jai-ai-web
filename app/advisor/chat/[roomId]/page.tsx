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
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface Message {
  id: string;
  content: string;
  file?: {
    fileUrl?: string;
    uri?: string;
    name?: string;
    type?: string;
  };
  isAudioMessage?: boolean;
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
  imageUrl?: string;
  imageType?: string;
  imageName?: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaName?: string;
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
  const [chatUser, setChatUser] = useState<{ name?: string; phone?: string; email?: string; profilePhoto?: string; photoURL?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const unsubscribeChatRoom = onSnapshot(doc(db, 'chatRooms', roomId), (doc) => {
        if (doc.exists()) {
          setChatRoom({ id: doc.id, ...doc.data() } as ChatRoom);
        }
        setLoading(false);
      }, (error) => {
        console.error('Error listening to chat room:', error);
        setLoading(false);
      });

      const unsubscribeMessages = onSnapshot(
        query(
          collection(db, 'chatRooms', roomId, 'messages'),
          orderBy('createdAt', 'asc')
        ),
        (snapshot) => {
          const msgs: Message[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as MessageFirestore;
            const content = data.content ?? data.text ?? '';

            let file = data.file ?? undefined;
            if (!file && data.fileUrl) {
              file = { fileUrl: data.fileUrl };
            }
            if (!file && data.audioUrl) {
              file = {
                fileUrl: data.audioUrl,
                type: data.audioType || 'audio/mpeg',
                name: data.audioName,
              };
            }
            if (!file && data.imageUrl) {
              file = {
                fileUrl: data.imageUrl,
                type: data.imageType || 'image/jpeg',
                name: data.imageName,
              };
            }
            if (!file && data.mediaUrl) {
              file = {
                fileUrl: data.mediaUrl,
                type: data.mediaType,
                name: data.mediaName,
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

      const fetchChatUser = async (uid?: string) => {
        if (!uid) return setChatUser(null);
        try {
          const uDoc = await getDoc(doc(db, 'users', uid));
          if (uDoc.exists()) setChatUser(uDoc.data() as { name?: string; phone?: string; email?: string; profilePhoto?: string; photoURL?: string });
          else setChatUser(null);
        } catch (err: unknown) {
          console.error('Failed to fetch chat user profile', err);
          setChatUser(null);
        }
      };

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
        senderType: 'advisor' as const,
        userId: chatRoom.userId,
        advisorId: chatRoom.advisorId,
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const endSession = async () => {
    if (!chatRequest || !user || !chatRoom) return;
    
    if (!confirm('Are you sure you want to end this chat session? This action cannot be undone.')) {
      return;
    }
    
    try {
      await updateDoc(doc(db, 'chatRequests', chatRequest.id), {
        status: 'closed',
        closedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'chatRooms', roomId), {
        status: 'closed',
        closedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'advisors', chatRoom.advisorId), {
        busy: false,
        busySince: deleteField(),
        totalUsersAttended: increment(1),
      });

      try {
        const endChatFunction = httpsCallable(functions, 'endChat');
        await endChatFunction({
          roomId: roomId,
          chatRequestId: chatRequest.id
        });
      } catch (fnError) {
        console.log('Cloud function not available, but session ended successfully', fnError);
      }
      
      router.push('/advisor/dashboard');
    } catch (error) {
      console.error('Error ending session:', error);
      alert('Failed to end session');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-slate-600 font-medium">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!chatRoom || chatRoom.status=='closed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Chat Room Not Found</h1>
          <p className="text-slate-500 text-sm mb-6">Room ID: {roomId}</p>
          <button
            onClick={() => router.push('/advisor/dashboard')}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-2">
      <div className="max-w-4xl mx-auto h-[calc(100vh-1rem)] flex flex-col gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/60 px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {chatUser?.profilePhoto || chatUser?.photoURL ? (
                <img
                  src={chatUser.profilePhoto || chatUser.photoURL}
                  alt={chatUser?.name || 'User'}
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-100 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg shadow-md">
                  {chatUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <div>
                <h1 className="text-lg font-semibold text-slate-800">
                  {chatUser?.name || 'User'}
                </h1>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Active now
                  </span>
                  {chatUser?.phone && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {chatUser.phone}
                    </span>
                  )}
                  {chatUser?.email && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {chatUser.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/advisor/dashboard')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </button>
              <button
                onClick={endSession}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                End Session
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-3 bg-white/40 rounded-2xl border border-slate-200/40">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium">No messages yet</p>
              <p className="text-sm text-slate-400 mt-1">Start the conversation!</p>
            </div>
          ) : (
            <>
            {messages.map((message) => {
              const isFromAdvisor = message.senderType === 'advisor';
              return (
                <div
                  key={message.id}
                  className={`flex ${isFromAdvisor ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] lg:max-w-[60%] rounded-2xl shadow-sm ${
                      isFromAdvisor
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                    }`}
                  >
                    {message.isAudioMessage && (message.file?.fileUrl || message.file?.uri) ? (
                      <div className="px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className={`w-4 h-4 ${isFromAdvisor ? 'text-blue-200' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          <span className={`text-xs ${isFromAdvisor ? 'text-blue-100' : 'text-slate-500'}`}>Voice Message</span>
                        </div>
                        <audio
                          controls
                          src={message.file?.fileUrl || message.file?.uri}
                          className="w-full min-w-80"
                        >
                          Your browser does not support the audio element.
                        </audio>
                        {message.transcription && (
                          <div className={`text-xs italic mt-2 p-2 rounded-lg ${isFromAdvisor ? 'bg-blue-400/30 text-blue-100' : 'bg-slate-100 text-slate-600'}`}>
                            {message.transcription}
                          </div>
                        )}
                        <span className={`text-[10px] block mt-1 ${isFromAdvisor ? 'text-blue-200' : 'text-slate-400'}`}>
                          {(message.createdAt as { toDate?: () => Date })?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...'}
                        </span>
                      </div>
                    ) : message.file && (message.file.fileUrl || message.file.uri) ? (
                      <div className="px-3 py-2">
                        {(() => {
                          const fileUrl = message.file.fileUrl || message.file.uri || '';
                          const fileName = message.file.name || 'File';
                          const fileType = message.file.type || '';
                          const isImage = fileType.startsWith('image/') || 
                            /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif)(\?.*)?$/i.test(fileUrl) ||
                            /firebasestorage.*\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif)/i.test(fileUrl) ||
                            fileUrl.includes('images%2F') ||
                            (fileType === '' && /\/(jpg|jpeg|png|gif|webp)/i.test(fileUrl));
                          const isPdf = fileType === 'application/pdf' || /\.pdf(\?.*)?$/i.test(fileUrl);

                          if (isImage) {
                            return (
                              <div>
                                <img
                                  src={fileUrl}
                                  alt={fileName}
                                  className="max-w-full max-h-[300px] rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(fileUrl, '_blank')}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.parentElement?.classList.add('image-load-failed');
                                  }}
                                />
                                {message.content && (
                                  <p className={`mt-2 text-[15px] leading-snug ${isFromAdvisor ? 'text-white' : 'text-slate-800'}`}>{message.content}</p>
                                )}
                              </div>
                            );
                          } else if (isPdf) {
                            return (
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isFromAdvisor ? 'bg-blue-400/30 hover:bg-blue-400/40' : 'bg-slate-100 hover:bg-slate-200'}`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isFromAdvisor ? 'bg-red-400' : 'bg-red-500'}`}>
                                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1v4h-1v-4zm2 0h1.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5H11.5v1h-1v-4zm1 2h.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5h-.5v1zm2.5-2h1.5c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1H14v-4zm1 3h.5v-2H15v2z"/>
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${isFromAdvisor ? 'text-white' : 'text-slate-700'}`}>{fileName}</p>
                                  <p className={`text-xs ${isFromAdvisor ? 'text-blue-200' : 'text-slate-500'}`}>PDF Document</p>
                                </div>
                                <span className={`text-xs font-medium ${isFromAdvisor ? 'text-blue-100' : 'text-blue-600'}`}>Open</span>
                              </a>
                            );
                          } else {
                            return (
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isFromAdvisor ? 'bg-blue-400/30 hover:bg-blue-400/40' : 'bg-slate-100 hover:bg-slate-200'}`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isFromAdvisor ? 'bg-blue-400' : 'bg-slate-400'}`}>
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${isFromAdvisor ? 'text-white' : 'text-slate-700'}`}>{fileName}</p>
                                  <p className={`text-xs ${isFromAdvisor ? 'text-blue-200' : 'text-slate-500'}`}>Attachment</p>
                                </div>
                                <span className={`text-xs font-medium ${isFromAdvisor ? 'text-blue-100' : 'text-blue-600'}`}>Open</span>
                              </a>
                            );
                          }
                        })()}
                        <span className={`text-[10px] block mt-1 ${isFromAdvisor ? 'text-blue-200' : 'text-slate-400'}`}>
                          {(message.createdAt as { toDate?: () => Date })?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...'}
                        </span>
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 flex items-end gap-2">
                        <p className="break-words text-[15px] leading-snug flex-1">{message.content}</p>
                        <span className={`text-[10px] whitespace-nowrap flex-shrink-0 pb-0.5 ${isFromAdvisor ? 'text-blue-200' : 'text-slate-400'}`}>
                          {(message.createdAt as { toDate?: () => Date })?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-lg p-4">
          <div className="flex items-center gap-3 max-w-3xl mx-auto">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-5 py-3 bg-slate-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700 placeholder-slate-400"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg disabled:shadow-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}