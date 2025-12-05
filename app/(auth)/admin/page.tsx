"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Mail, Lock } from "lucide-react";

export default function Admin() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
      setMessage("Login successful!");
      router.push("/admin/all-advisors");
    } catch (err: unknown) {
      console.error("Firebase Auth Error:", err);
      let errorMessage = "An error occurred. Please try again.";

      if (typeof err === "object" && err !== null) {
        type ErrObj = { code?: string; message?: string };
        const e = err as ErrObj;
        switch (e.code) {
          case "auth/user-not-found":
            errorMessage =
              "No account found with this email. Please sign up first.";
            break;
          case "auth/wrong-password":
            errorMessage = "Incorrect password. Please try again.";
            break;
          case "auth/invalid-credential":
            errorMessage =
              "Invalid email or password. Please check your credentials and try again.";
            break;
          case "auth/invalid-email":
            errorMessage = "Please enter a valid email address.";
            break;
          case "auth/too-many-requests":
            errorMessage = "Too many failed attempts. Please try again later.";
            break;
          case "auth/user-disabled":
            errorMessage =
              "This account has been disabled. Please contact support.";
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
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 border border-blue-200"
      >
        <h2 className="text-3xl font-bold text-center text-blue-500">
          Admin Login
        </h2>
        <p className="text-center text-blue-600 text-lg">
          Sign in to your admin account
        </p>

        <div className="space-y-4">
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
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Signing In..." : "Login"}
        </button>
        {message && (
          <p
            className={`text-center mt-3 text-sm ${
              message.includes("successful") ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
