"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Image from 'next/image';
import {
  Camera,
  Upload,
  User,
  Calendar,
  Briefcase,
  Mail,
  Sparkles,
  Phone,
  Lock,
  Award,
  ChevronDown,
} from "lucide-react";

// Predefined specialization categories
const SPECIALIZATION_OPTIONS = [
  "Nutrition & Diet",
  "Fitness",
  "Mental Health",
  "General Medicine",
  "Sexual Health",
  "Chronic Diseases",
  "Skin & Beauty",
  "Addiction",
  "Finance",
  "CA Taxes",
  "Lawyer",
  "Government",
  "Career Coach",
  "Shopping",
  "Relationship",
  "Astro"
];

export default function SignUpForm() {
  const [form, setForm] = useState({
    name: "",
    age: "",
    experience: "",
    degree: "",
    specialization: [] as string[],
    certification: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showSpecializationDropdown, setShowSpecializationDropdown] = useState(false);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showSpecializationDropdown && !target.closest('.specialization-dropdown')) {
        setShowSpecializationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSpecializationDropdown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSpecializationToggle = (specialization: string) => {
    setForm(prev => ({
      ...prev,
      specialization: prev.specialization.includes(specialization)
        ? prev.specialization.filter(s => s !== specialization)
        : [...prev.specialization, specialization]
    }));
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
      // Basic form validation
      if (form.password.length < 6) {
        setMessage("Password must be at least 6 characters long");
        setLoading(false);
        return;
      }

      if (form.password !== form.confirmPassword) {
        setMessage("Passwords do not match");
        setLoading(false);
        return;
      }

      if (form.specialization.length === 0) {
        setMessage("Please select at least one specialization");
        setLoading(false);
        return;
      }

      // Format phone number for storage (use `phone` field)
      let formattedPhone = form.phone.trim();
      if (formattedPhone && !formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);

      // Upload profile photo if exists
      let photoURL = "";
      if (photo) {
        const storageRef = ref(
          storage,
          `profilePhotos/${photo.name}-${Date.now()}`
        );
        await uploadBytes(storageRef, photo);
        photoURL = await getDownloadURL(storageRef);
      }

      // Save advisor profile to Firestore (use advisors collection)
      await addDoc(collection(db, "advisors"), {
        uid: userCredential.user.uid,
        name: form.name.trim().replace(/\s+/g, ' ').toLowerCase(),
        age: form.age,
        experience: form.experience,
        degree: form.degree,
        specialization: form.specialization, // Array of strings (UI label)
        certification: form.certification.trim(),
        email: form.email.trim(),
        phone: formattedPhone,
        profilePhoto: photoURL,
        busy: false,
        isActive: true,
        totalUsersAttended: 0, // Initialize user count
        createdAt: new Date(),
      });

      setMessage("Account created successfully!");
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Firebase Auth Error:', err);

      let errorMessage = "An error occurred. Please try again.";

      if (typeof err === 'object' && err !== null) {
        type ErrObj = { code?: string; message?: string };
        const e = err as ErrObj;
        switch (e.code) {
          case 'auth/email-already-in-use':
            errorMessage = "An account with this email already exists. Please login instead.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Please enter a valid email address.";
            break;
          case 'auth/weak-password':
            errorMessage = "Password is too weak. Please use at least 6 characters with a mix of letters and numbers.";
            break;
          case 'auth/operation-not-allowed':
            errorMessage = "Email/password sign-up is not enabled. Please contact support.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many requests. Please wait a moment before trying again.";
            break;
          default:
            errorMessage = `Error: ${e.message ?? String(err)}`;
        }
      } else if (err instanceof Error) {
        errorMessage = `Error: ${err.message}`;
      }

      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-white py-4 overflow-auto relative">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 space-y-4 border border-blue-200"
      >
        <h2 className="text-3xl font-bold text-center text-blue-500">
          Sign Up as Advisor
        </h2>
        <p className="text-center text-blue-600 text-lg">
          Create your advisor profile
        </p>

        {/* Profile Photo Upload */}
        <div className="flex flex-col items-center">
          <div className="relative w-28 h-28 rounded-full border-4 border-blue-200 flex items-center justify-center bg-gray-100 overflow-hidden">
            {preview ? (
              <Image
                src={preview}
                alt="Profile Preview"
                width={112}
                height={112}
                className="w-full h-full object-cover"
                style={{ objectFit: 'cover' }}
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
              Experience (years)
            </label>
            <input
              name="experience"
              type="number"
              placeholder="e.g., 5"
              value={form.experience}
              onChange={handleChange}
              className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
              required
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
              <Award size={20} />
              Degree
            </label>
            <input
              name="degree"
              placeholder="e.g., MBBS, MSc Nutrition, BPharm"
              value={form.degree}
              onChange={handleChange}
              className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
              required
            />
          </div>

          <div className="group relative specialization-dropdown">
            <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
              <Sparkles size={20} />
              Specialization
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpecializationDropdown(!showSpecializationDropdown)}
                className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200 text-left flex items-center justify-between"
              >
                <span className={form.specialization.length === 0 ? "text-gray-400" : "text-black"}>
                  {form.specialization.length === 0 
                    ? "Select specializations..." 
                    : `${form.specialization.length} selected`}
                </span>
                <ChevronDown size={20} className={`transition-transform ${showSpecializationDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showSpecializationDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                  {SPECIALIZATION_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className="flex items-center p-3 hover:bg-blue-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.specialization.includes(option)}
                        onChange={() => handleSpecializationToggle(option)}
                        className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            {form.specialization.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.specialization.map((spec) => (
                  <span
                    key={spec}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                  >
                    {spec}
                    <button
                      type="button"
                      onClick={() => handleSpecializationToggle(spec)}
                      className="ml-1 text-blue-500 hover:text-blue-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
              <Award size={20} />
              Certification
            </label>
            <input
              name="certification"
              placeholder="e.g., Certified Nutritionist, Licensed Therapist, Degree"
              value={form.certification}
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
              name="email"
              type="email"
              placeholder="your.email@example.com"
              value={form.email}
              onChange={handleChange}
              className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
              required
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
              <Phone size={20} />
              Phone
            </label>
            <input
              name="phone"
              type="tel"
              placeholder="+1234567890"
              value={form.phone}
              onChange={handleChange}
              className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Include country code (e.g., +1 for US, +91 for India)
            </p>
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
              <Lock size={20} />
              Password
            </label>
            <input
              name="password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
              required
              minLength={6}
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-blue-500 text-lg font-medium mb-2">
              <Lock size={20} />
              Confirm Password
            </label>
            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full bg-blue-300/10 backdrop-blur-sm border border-blue-500/10 rounded-xl p-3 text-black placeholder-gray-400 outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all duration-200"
              required
              minLength={6}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>

        <div className="text-center">
          <p className="text-gray-600">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-blue-500 font-medium hover:underline"
            >
              Login here
            </button>
          </p>
        </div>

        {message && (
          <p className={`text-center mt-3 text-sm ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}