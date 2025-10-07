'use client';

import { auth, db, functions } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ChatRequest {
  id: string;
  userId: string;
  advisorId: string;
  roomId: string;
  status: 'active' | 'accepted' | 'closed';
  createdAt: unknown;
  acceptedAt?: unknown;
  paymentMethod?: 'wallet' | 'razorpay';
  payment?: {
    sessionId?: string;
    paymentId?: string;
    method?: 'wallet' | 'razorpay';
    walletTransactionId?: string;
  };
}

interface Advisor {
  id: string;
  name: string;
  email: string;
  busy: boolean;
  busySince?: unknown;
}

export default function AdvisorDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        // Redirect to login if not authenticated
        router.push('/login');
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (user) {
      // Use the authenticated user's UID as advisor ID
      const advisorId = user.uid;
      
      // Listen to advisor data
      const unsubscribeAdvisor = onSnapshot(doc(db, 'advisors', advisorId), (doc) => {
        if (doc.exists()) {
          setAdvisor({ id: doc.id, ...doc.data() } as Advisor);
        }
        setLoading(false);
      });

      // Listen to chat requests for this advisor (both active and accepted)
      const unsubscribeChatRequests = onSnapshot(
        query(
          collection(db, 'chatRequests'),
          where('advisorId', '==', advisorId),
          where('status', 'in', ['active', 'accepted'])
        ),
        (snapshot) => {
          const requests: ChatRequest[] = [];
          snapshot.forEach((doc) => {
            requests.push({ id: doc.id, ...doc.data() } as ChatRequest);
          });
          setChatRequests(requests);
        }
      );

      return () => {
        unsubscribeAdvisor();
        unsubscribeChatRequests();
      };
    }
  }, [user]);

  const toggleAvailability = async () => {
    if (!advisor || !user) return;

    try {
      await updateDoc(doc(db, 'advisors', user.uid), {
        busy: !advisor.busy,
        busySince: advisor.busy ? null : new Date(),
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Failed to update availability');
    }
  };

  const acceptChatRequest = async (requestId: string, roomId: string) => {
    if (!user) return;
    
    try {
      const batch = writeBatch(db);
      
      // Get the chat request to find the userId
      const chatRequestDoc = await getDoc(doc(db, 'chatRequests', requestId));
      if (!chatRequestDoc.exists()) {
        alert('Chat request not found');
        return;
      }
      
      const chatRequestData = chatRequestDoc.data();
      
      // Create chat room document
      batch.set(doc(db, 'chatRooms', roomId), {
        userId: chatRequestData.userId,
        advisorId: user.uid,
        status: 'active',
        createdAt: new Date(),
      });
      
      // Update chat request status
      batch.update(doc(db, 'chatRequests', requestId), {
        status: 'accepted',
        acceptedAt: new Date(),
      });

      // Update advisor to busy
      // batch.update(doc(db, 'advisors', user.uid), {
      //   busy: true,
      //   busySince: new Date(),
      // });

      await batch.commit();
      
      // Redirect to chat interface
      window.open(`/chat/${roomId}`, '_blank');
    } catch (error) {
      console.error('Error accepting chat request:', error);
      alert('Failed to accept chat request');
    }
  };

  const joinChat = (roomId: string) => {
    // Open chat in new tab
    window.open(`/chat/${roomId}`, '_blank');
  };

  const endSession = async (requestId: string) => {
    if (!user) return;
    
    try {
      // Get the chat request to find the room ID
      const chatRequestDoc = await getDoc(doc(db, 'chatRequests', requestId));
      if (!chatRequestDoc.exists()) {
        alert('Chat request not found');
        return;
      }
      
      const chatRequestData = chatRequestDoc.data();
      const endChatFunction = httpsCallable(functions, 'endChat');
      await endChatFunction({
        roomId: chatRequestData.roomId,
        chatRequestId: requestId
      });
    } catch (error) {
      console.error('Error ending session:', error);
      alert('Failed to end session');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading advisor dashboard...</p>
        </div>
      </div>
    );
  }

  if (!advisor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Advisor Profile Not Found</h1>
          <p className="text-gray-600 mb-4">
            No advisor profile found for your account. Please contact support.
          </p>
          <div className="space-x-4">
            <button
              onClick={handleSignOut}
              className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Advisor Dashboard</h1>
              <p className="text-gray-600">Welcome, {advisor.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    advisor.busy ? 'bg-red-500' : 'bg-green-500'
                  }`}
                ></div>
                <span className={`font-medium ${
                  advisor.busy ? 'text-red-600' : 'text-green-600'
                }`}>
                  {advisor.busy ? 'Busy' : 'Available'}
                </span>
              </div>
              <button
                onClick={toggleAvailability}
                className={`px-4 py-2 rounded-md font-medium ${
                  advisor.busy
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {advisor.busy ? 'Go Available' : 'Go Busy'}
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-md font-medium bg-gray-600 text-white hover:bg-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Chat Requests */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800">
              Chat Requests ({chatRequests.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {chatRequests.filter(r => r.status === 'active').length} new requests, {' '}
              {chatRequests.filter(r => r.status === 'accepted').length} in progress
            </p>
          </div>
          <div className="p-6">
            {chatRequests.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">💬</div>
                <p className="text-gray-600 text-lg">No chat requests</p>
                <p className="text-gray-500">New requests and ongoing sessions will appear here automatically</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chatRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-lg">
                              {request.userId.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-gray-800">
                                User: {request.userId.slice(0, 8)}...
                              </p>
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                request.status === 'active' 
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {request.status === 'active' ? 'New Request' : 'In Progress'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Request ID: {request.id.slice(0, 8)}...
                            </p>
                            <p className="text-sm text-gray-500">
                              Payment: {request.payment?.paymentId ? request.payment.paymentId.slice(0, 10) + '...' : 
                                       request.paymentMethod === 'wallet' ? 'Paid via Wallet' : 'Payment Info'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {request.status === 'active' ? (
                          <button
                            onClick={() => acceptChatRequest(request.id, request.roomId)}
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium"
                          >
                            Accept & Chat
                          </button>
                        ) : (
                          <button
                            onClick={() => joinChat(request.roomId)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
                          >
                            Join Chat
                          </button>
                        )}
                        <button
                          onClick={() => endSession(request.id)}
                          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-medium"
                        >
                          End Session
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}