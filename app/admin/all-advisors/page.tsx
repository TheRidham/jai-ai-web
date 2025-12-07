"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { LogOut, Trash2, User, Mail, Phone, Loader2, MessageSquare } from "lucide-react";
import Image from "next/image";

interface Advisor {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  specialization?: string[];
  profilePhoto?: string;
  [key: string]: unknown;
}

export default function AllAdvisors() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/admin");
      } else {
        setAuthChecked(true);
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchAdvisors = async () => {
      try {
        const advisorsSnapshot = await getDocs(collection(db, "advisors"));
        const advisorsList: Advisor[] = advisorsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAdvisors(advisorsList);
      } catch (error) {
        console.error("Error fetching advisors:", error);
      } finally {
        setLoading(false);
      }
    };

    if (authChecked) {
      fetchAdvisors();
    }
  }, [authChecked]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/admin");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDeleteAdvisor = async (advisorId: string) => {
    if (!confirm("Are you sure you want to delete this advisor? This action cannot be undone.")) {
      return;
    }

    setDeleting(advisorId);
    try {
      await deleteDoc(doc(db, "advisors", advisorId));
      setAdvisors((prev) => prev.filter((advisor) => advisor.id !== advisorId));
    } catch (error) {
      console.error("Error deleting advisor:", error);
      alert("Failed to delete advisor. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-blue-600">Admin Dashboard</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/admin/analysis")}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <LogOut size={18} />
                Analysis
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            All Advisors ({advisors.length})
          </h2>
          <p className="text-gray-500 mt-1">
            Manage all registered advisors in the system
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Loading advisors...</span>
          </div>
        ) : advisors.length === 0 ? (
          <div className="text-center py-20">
            <User className="w-16 h-16 mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-600">
              No advisors found
            </h3>
            <p className="text-gray-400 mt-1">
              There are no advisors registered in the system yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advisors.map((advisor) => (
              <div
                key={advisor.id}
                className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
                  <div className="flex items-center gap-4">
                    {advisor.profilePhoto ? (
                      <Image
                        src={advisor.profilePhoto}
                        alt={advisor.name || "Advisor"}
                        width={48}
                        height={48}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {advisor.name || "Unknown Name"}
                      </h3>
                      {advisor.specialization && (
                        <p className="text-blue-100 text-sm truncate">
                          {advisor.specialization.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {advisor.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm truncate">{advisor.email}</span>
                    </div>
                  )}
                  {advisor.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm">{advisor.phone}</span>
                    </div>
                  )}
                </div>

                <div className="px-4 pb-4">
                  <button
                    onClick={() => handleDeleteAdvisor(advisor.id)}
                    disabled={deleting === advisor.id}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting === advisor.id ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Delete Advisor
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}