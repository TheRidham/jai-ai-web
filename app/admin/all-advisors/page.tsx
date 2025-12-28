"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { LogOut, Trash2, User, Mail, Phone, Loader2, Pencil, ChartNoAxesColumnIncreasing } from "lucide-react";
import Image from "next/image";
import AdvisorProfileForm, {
  AdvisorFormSubmitPayload,
} from "@/app/components/AdvisorProfileForm";

interface Advisor {
  id: string;
  uid?: string;
  name?: string;
  age?: string | number;
  experience?: string | number;
  degree?: string;
  certification?: string;
  email?: string;
  phone?: string;
  specialization?: string[];
  profilePhoto?: string;
  password?: string;
  [key: string]: unknown;
}

export default function AllAdvisors() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [editFeedback, setEditFeedback] = useState<
    { text: string; variant: "success" | "error" | "info" }
  | null>(null);
  const [updating, setUpdating] = useState(false);
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

  const handleLoginAsAdvisor = async (advisor: Advisor) => {
    if (!advisor.email) {
      alert("Advisor is missing an email address. Unable to impersonate.");
      return;
    }

    // if (!advisor.password || typeof advisor.password !== "string") {
    //   alert("Advisor is missing a password. Please add one before impersonating.");
    //   return;
    // }

    setImpersonating(advisor.id);
    try {
      await signInWithEmailAndPassword(
        auth,
        advisor.email,
        advisor.password ?? "123456"
      );
      router.push("/advisor/dashboard");
    } catch (error) {
      console.error("Error impersonating advisor:", error);
      alert("Failed to log in as advisor. Please verify the temporary password and try again.");
    } finally {
      setImpersonating(null);
    }
  };

  const handleStartEditing = (advisor: Advisor) => {
    setEditingAdvisor(advisor);
    setEditFeedback(null);
  };

  const handleUpdateAdvisor = async (payload: AdvisorFormSubmitPayload) => {
    if (!editingAdvisor) {
      return;
    }

    if (payload.specialization.length === 0) {
      setEditFeedback({
        text: "Please select at least one specialization before saving.",
        variant: "error",
      });
      return;
    }

    const hasPasswordInput = payload.password || payload.confirmPassword;
    if (hasPasswordInput && payload.password !== payload.confirmPassword) {
      setEditFeedback({
        text: "Passwords do not match. Please re-enter.",
        variant: "error",
      });
      return;
    }

    if (payload.password && payload.password.length < 6) {
      setEditFeedback({
        text: "Password must be at least 6 characters long.",
        variant: "error",
      });
      return;
    }

    setUpdating(true);
    setEditFeedback(null);

    try {
      let formattedPhone = payload.phone;
      if (formattedPhone && !formattedPhone.startsWith("+")) {
        formattedPhone = `+${formattedPhone}`;
      }

      let profilePhotoUrl = payload.profilePhoto;
      if (payload.photoFile) {
        const storageRef = ref(
          storage,
          `profilePhotos/${payload.photoFile.name}-${Date.now()}`
        );
        await uploadBytes(storageRef, payload.photoFile);
        profilePhotoUrl = await getDownloadURL(storageRef);
      }

      const passwordToPersist =
        payload.password ||
        (typeof editingAdvisor.password === "string"
          ? editingAdvisor.password
          : "");

      const updatedData: Record<string, unknown> = {
        name: payload.name,
        age: payload.age,
        experience: payload.experience,
        degree: payload.degree,
        specialization: payload.specialization,
        certification: payload.certification,
        email: payload.email,
        phone: formattedPhone,
        profilePhoto: profilePhotoUrl,
      };

      if (passwordToPersist) {
        updatedData.password = passwordToPersist;
      }

      await updateDoc(doc(db, "advisors", editingAdvisor.id), updatedData);

      setAdvisors((prev) =>
        prev.map((advisor) =>
          advisor.id === editingAdvisor.id
            ? {
                ...advisor,
                ...updatedData,
              }
            : advisor
        )
      );

      setEditingAdvisor(null);
    } catch (error) {
      console.error("Error updating advisor:", error);
      setEditFeedback({
        text: "Failed to update advisor. Please try again.",
        variant: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleCloseEditor = () => {
    if (updating) {
      return;
    }
    setEditingAdvisor(null);
    setEditFeedback(null);
  };

  const toInputString = (value: unknown) =>
    typeof value === "string"
      ? value
      : value === undefined || value === null
      ? ""
      : String(value);

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
              <ChartNoAxesColumnIncreasing size={18} /> 
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
                className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleLoginAsAdvisor(advisor)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleLoginAsAdvisor(advisor);
                  }
                }}
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

                <div className="px-4 pb-4 space-y-2">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleStartEditing(advisor);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Pencil size={16} />
                    Edit Advisor
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteAdvisor(advisor.id);
                    }}
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
                  {impersonating === advisor.id && (
                    <p className="text-center text-sm text-blue-500">Logging in as advisor...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {editingAdvisor && (
        <div
          className="fixed overflow-y-scroll h-screen top-0 left-0 w-full bg-black/30 backdrop-blur-sm flex items-center justify-center px-4 py-8 z-50"
          onClick={handleCloseEditor}
        >
          <div
            className="w-full max-w-3xl h-full"
            onClick={(event) => event.stopPropagation()}
          >
            <AdvisorProfileForm
              mode="edit"
              initialValues={{
                name: toInputString(editingAdvisor.name),
                age: toInputString(editingAdvisor.age),
                experience: toInputString(editingAdvisor.experience),
                degree: toInputString(editingAdvisor.degree),
                specialization: Array.isArray(editingAdvisor.specialization)
                  ? editingAdvisor.specialization.filter(
                      (item): item is string => typeof item === "string"
                    )
                  : [],
                certification: toInputString(editingAdvisor.certification),
                email: toInputString(editingAdvisor.email),
                phone: toInputString(editingAdvisor.phone),
                password:
                  typeof editingAdvisor.password === "string"
                    ? editingAdvisor.password
                    : "",
                confirmPassword:
                  typeof editingAdvisor.password === "string"
                    ? editingAdvisor.password
                    : "",
                profilePhoto:
                  typeof editingAdvisor.profilePhoto === "string"
                    ? editingAdvisor.profilePhoto
                    : "",
              }}
              onSubmit={handleUpdateAdvisor}
              loading={updating}
              message={editFeedback?.text ?? null}
              messageVariant={editFeedback?.variant ?? "info"}
              submitLabel="Save Changes"
              loadingLabel="Saving..."
              heading="Edit Advisor Profile"
              subheading="Update the advisor information and save your changes."
              footerContent={
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleCloseEditor}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    disabled={updating}
                  >
                    Cancel
                  </button>
                </div>
              }
              formClassName="bg-white rounded-2xl shadow-xl w-full p-6 space-y-6 border border-gray-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}