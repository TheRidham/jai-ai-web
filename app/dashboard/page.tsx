'use client';

import { auth, db, functions } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  documentId
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
  // optional: attached user details for display in the dashboard
  user?: {
    name?: string;
    phone?: string;
    phoneNumber?: string;
    email?: string;
  } | null;
}

interface Advisor {
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
  const [expert, setExpert] = useState<Advisor | null>(null);
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
      // Find advisor document by UID
      const expertQuery = query(
        collection(db, 'advisors'),
        where('uid', '==', user.uid)
      );
      
      // Listen to advisor data and chat requests for that advisor (use advisor doc ID)
      let unsubscribeChatRequests: (() => void) | null = null;
      const unsubscribeExpert = onSnapshot(expertQuery, (snapshot) => {
        if (!snapshot.empty) {
          const expertDoc = snapshot.docs[0];
          const adv = { id: expertDoc.id, ...expertDoc.data() } as Advisor;
          setExpert(adv);

          // If we had a previous listener for chatRequests, detach it first
          if (unsubscribeChatRequests) {
            try { unsubscribeChatRequests(); } catch { /* ignore */ }
            unsubscribeChatRequests = null;
          }

          // Listen for ACTIVE chat requests addressed to this advisor (advisor doc id)
          const chatReqQuery = query(
            collection(db, 'chatRequests'),
            where('advisorId', '==', adv.id),
            where('status', '==', 'active')
          );

          unsubscribeChatRequests = onSnapshot(chatReqQuery, (snap) => {
            (async () => {
              const requests: ChatRequest[] = [];
              snap.forEach((d) => requests.push({ id: d.id, ...d.data() } as ChatRequest));

              // Fetch user docs for each unique userId referenced in requests
                try {
                const userIds = Array.from(new Set(requests.map((r) => r.userId).filter(Boolean)));
                const usersMap: Record<string, ChatRequest['user']> = {};

                if (userIds.length > 0) {
                  // Use a single query when number of ids is within Firestore 'in' limits
                  if (userIds.length <= 10) {
                    try {
                      const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', userIds));
                      const usersSnap = await getDocs(usersQuery);
                      usersSnap.forEach((u) => {
                        usersMap[u.id] = u.data();
                      });
                    } catch (qErr) {
                      console.error('Failed users query, falling back to per-doc fetch', qErr);
                      await Promise.all(
                        userIds.map(async (uid) => {
                          try {
                            const uDoc = await getDoc(doc(db, 'users', uid));
                            if (uDoc.exists()) usersMap[uid] = uDoc.data();
                          } catch (err) {
                              console.error('Failed to fetch user', uid, err);
                            }
                        })
                      );
                    }
                  } else {
                    // Too many ids for an 'in' query — fetch in parallel
                    await Promise.all(
                      userIds.map(async (uid) => {
                        try {
                          const uDoc = await getDoc(doc(db, 'users', uid));
                          if (uDoc.exists()) usersMap[uid] = uDoc.data();
                        } catch (e) {
                          console.error('Failed to fetch user', uid, e);
                        }
                      })
                    );
                  }
                }

                const augmented = requests.map((r) => ({
                  ...r,
                  user: usersMap[r.userId] || null,
                }));

                setChatRequests(augmented);
                } catch (err) {
                console.error('Error attaching user details to chat requests', err);
                setChatRequests(requests);
              }
            })();
          });
        }
        setLoading(false);
      });

      return () => {
        unsubscribeExpert();
        if (unsubscribeChatRequests) try { unsubscribeChatRequests(); } catch { /* ignore */ }
      };
    }
  }, [user]);

  const toggleAvailability = async () => {
    if (!expert || !user) return;

    try {
      // Update in advisors collection using document ID
      await updateDoc(doc(db, 'advisors', expert.id), {
        busy: !expert.busy,
        busySince: expert.busy ? null : new Date(),
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Failed to update availability');
    }
  };

  

  const joinChat = (roomId: string) => {
    // Open chat in new tab
    window.open(`/chat/${roomId}`, '_blank');
  };

  const endSession = async (requestId: string) => {
    if (!user || !expert) return;
    
    try {
      // Get the chat request to find the room ID
      const chatRequestDoc = await getDoc(doc(db, 'chatRequests', requestId));
      if (!chatRequestDoc.exists()) {
        alert('Chat request not found');
        return;
      }
      
      const chatRequestData = chatRequestDoc.data();
      
      // Update chat request to closed
      await updateDoc(doc(db, 'chatRequests', requestId), {
        status: 'closed',
        closedAt: new Date(),
      });

      // Increment expert's user count
      await updateDoc(doc(db, 'advisors', expert.id), {
        totalUsersAttended: (expert.totalUsersAttended || 0) + 1,
        busy: false, // Set expert as available after ending session
      });

      // Optional: Call cloud function if exists
      try {
        const endChatFunction = httpsCallable(functions, 'endChat');
        await endChatFunction({
          roomId: chatRequestData.roomId,
          chatRequestId: requestId
        });
      } catch (fnError) {
        console.log('Cloud function not available, but session ended successfully', fnError);
      }
      
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

  if (!expert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Advisor Profile Not Found</h1>
          <p className="text-gray-600 mb-4">
            No advisor profile found for your account. Please sign up first.
          </p>
          <div className="space-x-4">
            <button
              onClick={() => router.push('/signup')}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Sign Up
            </button>
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
    <div className="flex-1 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800">Advisor Dashboard</h1>
              <p className="text-gray-600">Welcome, {expert.name}</p>
              <p className="text-sm text-gray-500 mb-2">
                {Array.isArray(expert.specialization) ? expert.specialization.join(', ') : expert.specialization}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span className="bg-blue-100 px-2 py-1 rounded-full">
                  {expert.experience} years experience
                </span>
                <span className="bg-green-100 px-2 py-1 rounded-full">
                  {expert.certification}
                </span>
                <span className="bg-purple-100 px-2 py-1 rounded-full">
                  {expert.totalUsersAttended || 0} users helped
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    expert.busy ? 'bg-red-500' : 'bg-green-500'
                  }`}
                ></div>
                <span className={`font-medium ${
                  expert.busy ? 'text-red-600' : 'text-green-600'
                }`}>
                  {expert.busy ? 'Busy' : 'Available'}
                </span>
              </div>
              <button
                onClick={toggleAvailability}
                className={`px-4 py-2 rounded-md font-medium ${
                  expert.busy
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {expert.busy ? 'Go Available' : 'Go Busy'}
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
              {chatRequests.length} new request{chatRequests.length !== 1 ? 's' : ''}
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
                              {request.user?.name
                                ? String(request.user.name)
                                    .split(' ')
                                    .map((p) => (p && p[0] ? p[0] : ''))
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase()
                                : '?'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-gray-800">
                                {request.user?.name ? `User: ${request.user.name}` : `User: Unknown`}
                              </p>
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                  request.status === 'active' 
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {request.status === 'active' ? 'New Request' : request.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600">Room ID: {request.roomId}</p>
                            <p className="text-sm text-gray-500">
                              Payment: {request.payment?.paymentId ? request.payment.paymentId.slice(0, 10) + '...' : 
                                       request.paymentMethod === 'wallet' ? 'Paid via Wallet' : 'Payment Info'}
                            </p>
                            <p className="text-sm text-gray-600">Phone: {request.user?.phone || request.user?.phoneNumber || '—'}</p>
                            <p className="text-sm text-gray-500">Email: {request.user?.email || '—'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => joinChat(request.roomId)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
                        >
                          Join Chat
                        </button>
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