"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import {
  Film,
  Heart,
  Loader2,
  LogOut,
  Trash2,
  Upload,
} from "lucide-react";

interface Reel {
  id: string;
  caption: string;
  videoUrl: string;
  likeCount: number;
  createdAt?: Date;
}

export default function AdminReelsPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingReelId, setDeletingReelId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reels, setReels] = useState<Reel[]>([]);

  const previewUrl = useMemo(() => {
    if (!videoFile) {
      return "";
    }
    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log("user: ", user);
      if (!user) {
        router.push("/admin");
      } else {
        setAuthChecked(true);
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchReels = async () => {
      try {
        const reelsQuery = query(
          collection(db, "reels"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(reelsQuery);
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          caption: String(item.data().caption ?? ""),
          videoUrl: String(item.data().videoUrl ?? ""),
          likeCount:
            typeof item.data().likeCount === "number" ? item.data().likeCount : 0,
          createdAt: item.data().createdAt?.toDate?.(),
        })) as Reel[];
        setReels(data);
      } catch (error) {
        console.error("Error fetching reels:", error);
        setMessage("Failed to load reels.");
      } finally {
        setLoading(false);
      }
    };

    if (authChecked) {
      fetchReels();
    }
  }, [authChecked]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/admin");
    } catch (error) {
      console.error("Error signing out:", error);
      setMessage("Failed to sign out.");
    }
  };

  const handleUploadReel = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!caption.trim()) {
      setMessage("Caption is required.");
      return;
    }

    if (!videoFile) {
      setMessage("Please select a video to upload.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const reelDocRef = await addDoc(collection(db, "reels"), {
        caption: caption.trim(),
        videoUrl: "",
        likeCount: 0,
        createdAt: serverTimestamp(),
      });

      const storageRef = ref(storage, `reels/${reelDocRef.id}/videoUrl`);
      const uploadTask = uploadBytesResumable(storageRef, videoFile);

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
          },
          (error) => {
            reject(error);
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (error) {
              reject(error);
            }
          }
        );
      });

      await updateDoc(doc(db, "reels", reelDocRef.id), {
        videoUrl: downloadUrl,
      });

      setReels((prev) => [
        {
          id: reelDocRef.id,
          caption: caption.trim(),
          videoUrl: downloadUrl,
          likeCount: 0,
          createdAt: new Date(),
        },
        ...prev,
      ]);

      setCaption("");
      setVideoFile(null);
      setUploadProgress(0);
      setMessage("Reel uploaded successfully.");
    } catch (error) {
      console.error("Error uploading reel:", error);
      setMessage("Failed to upload reel.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteReel = async (reel: Reel) => {
    if (
      !confirm(
        "Are you sure you want to delete this reel? This action removes both video and document."
      )
    ) {
      return;
    }

    setDeletingReelId(reel.id);
    setMessage(null);

    try {
      if (reel.videoUrl) {
        await deleteObject(ref(storage, reel.videoUrl));
      }
      await deleteDoc(doc(db, "reels", reel.id));
      setReels((prev) => prev.filter((item) => item.id !== reel.id));
      setMessage("Reel deleted successfully.");
    } catch (error) {
      console.error("Error deleting reel:", error);
      setMessage("Failed to delete reel.");
    } finally {
      setDeletingReelId(null);
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-blue-600">Reels Management</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/admin/all-advisors")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Back to Dashboard
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Upload New Reel</h2>
          </div>

          <form onSubmit={handleUploadReel} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Caption
              </label>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Write a caption for your reel"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none min-h-24"
                maxLength={2200}
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reel Video
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setVideoFile(file);
                }}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
                disabled={uploading}
              />
            </div>

            {previewUrl ? (
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-black max-w-xs">
                <video
                  src={previewUrl}
                  controls
                  className="w-full h-64 object-cover"
                />
              </div>
            ) : null}

            {uploading ? (
              <div className="space-y-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500">Uploading {uploadProgress}%</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Reel
                </>
              )}
            </button>
          </form>

          {message ? (
            <p className="mt-3 text-sm text-gray-700">{message}</p>
          ) : null}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">All Reels</h2>
            <span className="text-sm text-gray-500">{reels.length} total</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Loading reels...</span>
            </div>
          ) : reels.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center">
              <Film className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="mt-3 text-gray-500">No reels uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reels.map((reel) => (
                <article
                  key={reel.id}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
                >
                  <div className="bg-black aspect-9/16 w-full">
                    {reel.videoUrl ? (
                      <video
                        src={reel.videoUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                        Video unavailable
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap wrap-break-word">
                      {reel.caption || "No caption"}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-pink-50 text-pink-600 rounded-full text-sm font-medium">
                        <Heart className="w-4 h-4" />
                        {reel.likeCount}
                      </div>

                      <button
                        onClick={() => handleDeleteReel(reel)}
                        disabled={deletingReelId === reel.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {deletingReelId === reel.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Deleting
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
