"use client";
import { useState } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Camera,
  Upload,
  User,
  Calendar,
  Briefcase,
  Mail,
  Sparkles,
} from "lucide-react";

export default function ProfileForm() {
  const [form, setForm] = useState({
    name: "",
    age: "",
    experience: "",
    specialization: "",
    mailId: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      let photoURL = "";

      if (photo) {
        const storageRef = ref(
          storage,
          `profilePhotos/${photo.name}-${Date.now()}`
        );
        await uploadBytes(storageRef, photo);
        photoURL = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "profiles"), {
        name: form.name.trim().replace(/\s+/g, ' ').toLowerCase(),
        age: form.age,
        experience: form.experience,
        specialization: form.specialization.trim(),
        email: form.mailId.trim(),
        profilePhoto: photoURL,
        createdAt: new Date(),
      });

      setMessage("Profile saved successfully ✅");
      setForm({
        name: "",
        age: "",
        experience: "",
        specialization: "",
        mailId: "",
      });
      setPhoto(null);
      setPreview(null);
    } catch (err) {
      console.error(err);
      setMessage("Error saving profile ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 space-y-4 border border-blue-200"
      >
        <h2 className="text-3xl font-bold text-center text-blue-500">
          Create Expert Profile
        </h2>
        <p className="text-center text-blue-600 text-lg">
          Fill in your professional details
        </p>

        {/* Profile Photo Upload */}
        <div className="flex flex-col items-center">
          <div className="relative w-28 h-28 rounded-full border-4 border-blue-200 flex items-center justify-center bg-gray-100 overflow-hidden">
            {preview ? (
              <img
                src={preview}
                alt="Profile Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera size={40} className="text-gray-400" />
            )}
            <label
              htmlFor="photo"
              className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
            >
              <Upload size={24} className="text-white" />
            </label>
          </div>
          <input
            id="photo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <span className="text-[16px] text-blue-500 mt-2">
            Upload Profile Photo
          </span>
        </div>

        {/* Input Fields */}
        <div className="space-y-5">
          <div className="group">
            <label className="flex items-center gap-2 text-blue-600 font-medium text-lg mb-2">
              <User size={20} />
              Name
            </label>
            <input
              name="name"
              placeholder="Enter your full name"
              value={form.name}
              onChange={handleChange}
              className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
              required
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
              <Calendar size={20} />
              Age
            </label>
            <input
              name="age"
              type="number"
              placeholder="Enter your age"
              value={form.age}
              onChange={handleChange}
              className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
              required
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
              <Briefcase size={20} />
              Experience
            </label>
            <input
              name="experience"
              type="number"
              placeholder="e.g., 5 years"
              value={form.experience}
              onChange={handleChange}
              className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
              required
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
              <Sparkles size={20} />
              Specialization
            </label>
            <input
              name="specialization"
              placeholder="e.g., Nutrition & Diet"
              value={form.specialization}
              onChange={handleChange}
              className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
              required
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
              <Mail size={20} />
              Email
            </label>
            <input
              name="mailId"
              type="email"
              placeholder="your.email@example.com"
              value={form.mailId}
              onChange={handleChange}
              className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
        >
          {loading ? "Saving..." : "Create Profile"}
        </button>

        {message && (
          <p className="text-center mt-3 text-sm text-gray-600">{message}</p>
        )}
      </form>
    </div>
  );
}
